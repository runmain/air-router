package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"air_router/cache"
	"air_router/db"
	"air_router/models"
	"air_router/services"
	"air_router/utils"
	"air_router/utils/common"

	"github.com/gin-gonic/gin"
)

type ProxyHandler struct {
	AccountDB *db.AccountDB
	ModelDB   *db.ModelDB
}

// We'll use the existing globalAccountCounter from services package

// failedAccountsCache stores failed account IDs and their failure timestamps
var failedAccountsCache = make(map[int]int64)
var failedAccountsMutex sync.RWMutex

// isAccountFailed checks if an account is in the failed cache and if it's within 10 minutes
func isAccountFailed(accountID int) bool {
	failedAccountsMutex.RLock()
	defer failedAccountsMutex.RUnlock()

	if timestamp, exists := failedAccountsCache[accountID]; exists {
		// Check if the failure is within 10 minutes
		if time.Now().Unix()-timestamp < 10*60 {
			return true
		}
	}
	return false
}

// addFailedAccount adds an account to the failed cache
func addFailedAccount(accountID int) {
	failedAccountsMutex.Lock()
	defer failedAccountsMutex.Unlock()

	failedAccountsCache[accountID] = time.Now().Unix()
}

// removeFailedAccount removes an account from the failed cache
func removeFailedAccount(accountID int) {
	failedAccountsMutex.Lock()
	defer failedAccountsMutex.Unlock()

	delete(failedAccountsCache, accountID)
}

// NewProxyHandler creates a new ProxyHandler
func NewProxyHandler(accountDB *db.AccountDB, modelDB *db.ModelDB) *ProxyHandler {
	handler := &ProxyHandler{
		AccountDB: accountDB,
		ModelDB:   modelDB,
	}

	// Start the background task to refresh models cache
	go cache.StartModelsCacheTask(accountDB, modelDB)

	return handler
}

// extractModelID extracts model id from request body
func extractModelID(bodyBytes []byte) string {
	var requestBody map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &requestBody); err != nil {
		return ""
	}
	if modelID, ok := requestBody["model"].(string); ok {
		return modelID
	}
	return ""
}

// HandleProxy handles /v1/:path proxy requests
func (h *ProxyHandler) HandleProxy(c *gin.Context) {
	path := c.Param("path")

	// Check if it's /models path
	if path == "models" || path == "/models" {
		HandleModels(c, h.ModelDB)
		return
	}

	// Check USE_ALL_IN_ONE environment variable using common function
	useAllInOne := common.GetEnvOrDefault("USE_ALL_IN_ONE", "true")

	if useAllInOne == "true" {
		// New logic for all-in-one mode
		h.handleAllInOneProxy(c, path)
		return
	}

	// Read request body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendAPIError(c, http.StatusInternalServerError, common.ErrMsgFailedToReadBody, common.ErrTypeInternalServer)
		return
	}
	// log.Printf("[Proxy /v1/%s] Request body: %s", path, string(bodyBytes))

	// Extract model id using common function
	modelID := common.ExtractModelID(bodyBytes)

	if modelID == "" {
		// No model id specified, return error
		common.SendAPIError(c, http.StatusBadRequest, common.ErrMsgModelMissing, common.ErrTypeInvalidRequest)
		return
	}

	log.Printf("[Proxy /v1/%s] Model ID: %s", path, modelID)
	// Try to forward using accounts that support the model
	proxyService := services.NewProxyService()
	success, lastResp, lastBody := proxyService.TryWithRetryModel(c, path, modelID, bodyBytes)
	if success {
		return
	}

	// Return the last failed response
	if lastResp != nil {
		// Copy response headers
		for key, values := range lastResp.Header {
			for _, value := range values {
				c.Header(key, value)
			}
		}
		c.Status(lastResp.StatusCode)
		c.Data(lastResp.StatusCode, lastResp.Header.Get("Content-Type"), lastBody)
		return
	}

	// No accounts found for this model
	common.SendAPIError(c, http.StatusNotFound, fmt.Sprintf(common.ErrMsgNoAccountsFound, modelID), common.ErrTypeNotFound)
}

// handleAllInOneProxy handles proxy requests in all-in-one mode with retry logic
func (h *ProxyHandler) handleAllInOneProxy(c *gin.Context, path string) {
	// Read request body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendAPIError(c, http.StatusInternalServerError, common.ErrMsgFailedToReadBody, common.ErrTypeInternalServer)
		return
	}
	// log.Printf("[Proxy /v1/%s] All-in-one mode - Request body: %s", path, string(bodyBytes))

	// Parse request body to map[string]interface{}
	var requestBody map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &requestBody); err != nil {
		common.SendAPIError(c, http.StatusBadRequest, common.ErrMsgFailedToParseBody, common.ErrTypeInvalidRequest)
		return
	}

	// Extract model id
	modelID, ok := requestBody["model"].(string)
	if !ok || modelID == "" {
		common.SendAPIError(c, http.StatusBadRequest, common.ErrMsgModelMissing, common.ErrTypeInvalidRequest)
		return
	}

	log.Printf("[Proxy /v1/%s] All-in-one mode - Requested model ID: %s", path, modelID)

	// Get actual model IDs from database based on requested model ID
	model, err := h.ModelDB.GetModelByModelID(modelID)
	if err != nil {
		common.SendAPIError(c, http.StatusNotFound, fmt.Sprintf(common.ErrMsgNoModelsFound, modelID), common.ErrTypeNotFound)
		return
	}

	// Check if model is enabled
	if !model.Enabled {
		common.SendAPIError(c, http.StatusNotFound, fmt.Sprintf("Model '%s' is disabled", modelID), common.ErrTypeNotFound)
		return
	}

	// Get associated model IDs
	actualModelIDs := model.AssModelIDs
	if len(actualModelIDs) == 0 {
		common.SendAPIError(c, http.StatusNotFound, fmt.Sprintf(common.ErrMsgNoModelsFound, modelID), common.ErrTypeNotFound)
		return
	}

	// Randomly select one actual model ID using global counter
	selectedModelID := h.getRandomModelID(actualModelIDs)
	//log.Printf("[Proxy /v1/%s] All-in-one mode - Selected actual model ID: %s from %s", path, selectedModelID, model.ModelID)

	// Check if selectedModelID is a pattern (ends with *)
	if len(selectedModelID) > 0 && selectedModelID[len(selectedModelID)-1] == '*' {
		// Use pattern matching to get actual model ID from cache
		actualSelectedModelID, err := cache.GetRandomModelIDByPattern(selectedModelID)
		if err != nil {
			log.Printf("[Proxy /v1/%s] All-in-one mode - Pattern matching failed: %v", path, err)
			common.SendAPIError(c, http.StatusNotFound, fmt.Sprintf("Pattern '%s' matching failed: %s", selectedModelID, err.Error()), common.ErrTypeNotFound)
			return
		}
		log.Printf("[Proxy /v1/%s] All-in-one mode - Pattern '%s' resolved to actual model ID: %s", path, selectedModelID, actualSelectedModelID)
		selectedModelID = actualSelectedModelID
	}

	// Get accounts that support the selected model ID
	accounts := cache.GetAccountsForModel(selectedModelID)
	if len(accounts) == 0 {
		common.SendAPIError(c, http.StatusNotFound, fmt.Sprintf(common.ErrMsgNoAccountsFound, selectedModelID), common.ErrTypeNotFound)
		return
	}

	// Try up to 3 times with different accounts
	var lastResp *http.Response
	var lastRespBody []byte
	maxAttempts := 3
	if len(accounts) < 3 {
		maxAttempts = len(accounts)
	}

	for attempt := 0; attempt < maxAttempts; attempt++ {
		// Select an account, skipping failed ones
		var selectedAccount models.Account
		accountFound := false

		// Try to find a non-failed account
		for i := 0; i < len(accounts); i++ {
			tempAccount := h.getRandomAccount(accounts)
			if !isAccountFailed(tempAccount.ID) {
				selectedAccount = tempAccount
				accountFound = true
				break
			}
		}

		// If all accounts are failed, just use the randomly selected one
		if !accountFound {
			selectedAccount = h.getRandomAccount(accounts)
		}

		log.Printf("[Proxy /v1/%s] All-in-one mode - Attempt %d/%d with account: %s (ID: %d),model:%s", path, attempt+1, maxAttempts, selectedAccount.Name, selectedAccount.ID, selectedModelID)

		// Update request body with the actual model ID
		requestBody["model"] = selectedModelID
		updatedBodyBytes, err := json.Marshal(requestBody)
		if err != nil {
			common.SendAPIError(c, http.StatusInternalServerError, common.ErrMsgFailedToUpdateBody, common.ErrTypeInternalServer)
			return
		}

		// Forward request using the selected account
		proxyService := services.NewProxyService()
		resp, success, respBody := proxyService.TryWithAccount(c, selectedAccount, path, updatedBodyBytes, c.Request.Header)

		if resp != nil {
			// Keep track of last response for error reporting
			lastResp = resp
			lastRespBody = respBody

			if success {
				// Success! Remove from failed cache if it was there, then stream response and return
				defer resp.Body.Close()
				removeFailedAccount(selectedAccount.ID)
				utils.StreamResponse(c, resp)
				log.Printf("[Proxy /v1/%s] All-in-one mode - Success with account %s (ID: %d)", path, selectedAccount.BaseURL, selectedAccount.ID)
				return
			} else {
				// Failed - add to failed cache and try next account
				defer resp.Body.Close()
				addFailedAccount(selectedAccount.ID)
				log.Printf("[Proxy /v1/%s] All-in-one mode - Failed with account %s (ID: %d)", path, selectedAccount.Name, selectedAccount.ID)
			}
		} else {
			// No response - add to failed cache and try next account
			addFailedAccount(selectedAccount.ID)
			log.Printf("[Proxy /v1/%s] All-in-one mode - No response from account %s (ID: %d)", path, selectedAccount.Name, selectedAccount.ID)
		}
	}

	// All attempts failed - return the last response or generic error
	if lastResp != nil {
		// Copy response headers
		for key, values := range lastResp.Header {
			for _, value := range values {
				c.Header(key, value)
			}
		}
		c.Status(lastResp.StatusCode)
		c.Data(lastResp.StatusCode, lastResp.Header.Get("Content-Type"), lastRespBody)
		return
	}

	// No responses at all
	common.SendAPIError(c, http.StatusBadGateway, common.ErrMsgAllAttemptsFailed, common.ErrTypeForward)
}

// getRandomModelID randomly selects a model ID from the list using global counter
func (h *ProxyHandler) getRandomModelID(modelIDs []string) string {
	if len(modelIDs) == 0 {
		return ""
	}
	if len(modelIDs) == 1 {
		return modelIDs[0]
	}

	index := common.GetRandomIndex(len(modelIDs))
	return modelIDs[index]
}

// getRandomAccount randomly selects an account from the list using global counter
func (h *ProxyHandler) getRandomAccount(accounts []models.Account) models.Account {
	return common.GetRandomElement(accounts)
}

// forwardRequest forwards the request to the selected account
func (h *ProxyHandler) forwardRequest(c *gin.Context, path string, modelID string, bodyBytes []byte, account models.Account) {
	proxyService := services.NewProxyService()

	// Use TryWithAccount directly since we already have the specific account
	resp, success, respBody := proxyService.TryWithAccount(c, account, path, bodyBytes, c.Request.Header)
	if resp != nil {
		defer resp.Body.Close()
		if success {
			// Stream response
			utils.StreamResponse(c, resp)
			log.Printf("[ProxyService] Success with account %s (ID: %d)", account.BaseURL, account.ID)
			return
		} else {
			// Return the failed response
			// Copy response headers
			for key, values := range resp.Header {
				for _, value := range values {
					c.Header(key, value)
				}
			}
			c.Status(resp.StatusCode)
			c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
			return
		}
	}

	// If we get here, there was an error making the request
	c.JSON(http.StatusBadGateway, gin.H{
		"type": "error",
		"error": map[string]interface{}{
			"message": fmt.Sprintf("Failed to forward request to account '%s'", account.Name),
			"type":    "forward_error",
			"param":   nil,
			"code":    nil,
		},
	})
}
func (h *ProxyHandler) HandleDebugModels(c *gin.Context) {
	accounts := cache.GetAllModels()
	modelInfos := cache.GetAllModelInfos()

	var modelList []map[string]interface{}
	for modelID, accs := range accounts {
		modelInfo, exists := modelInfos[modelID]
		if !exists {
			continue
		}

		modelData := map[string]interface{}{
			"id":                       modelInfo.ID,
			"object":                   modelInfo.Object,
			"created":                  modelInfo.Created,
			"owned_by":                 modelInfo.OwnedBy,
			"supported_endpoint_types": modelInfo.SupportedEndpointTypes,
			"account_list":             accs,
		}

		if len(modelInfo.CompatibleProviders) > 0 {
			modelData["compatible_providers"] = modelInfo.CompatibleProviders
		}

		modelList = append(modelList, modelData)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    modelList,
		"object":  "list",
		"success": true,
	})
}

// HandleReloadModels manually triggers models cache refresh
func (h *ProxyHandler) HandleReloadModels(c *gin.Context) {
	// Execute refresh asynchronously
	go cache.RefreshModelsCache(h.AccountDB, h.ModelDB)

	c.JSON(http.StatusOK, gin.H{
		"message": "Cache refresh triggered",
		"success": true,
	})
}
