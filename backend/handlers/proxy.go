package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"go-web-project/cache"
	"go-web-project/db"
	"go-web-project/services"

	"github.com/gin-gonic/gin"
)

type ProxyHandler struct {
	AccountDB *db.AccountDB
}

// NewProxyHandler creates a new ProxyHandler
func NewProxyHandler(accountDB *db.AccountDB) *ProxyHandler {
	handler := &ProxyHandler{
		AccountDB: accountDB,
	}

	// Start the background task to refresh models cache
	go cache.StartModelsCacheTask(accountDB)

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
		HandleModels(c)
		return
	}

	// Read request body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read request body"})
		return
	}
	log.Printf("[Proxy /v1/%s] Request body: %s", path, string(bodyBytes))

	// Extract model id
	modelID := extractModelID(bodyBytes)

	if modelID == "" {
		// No model id specified, return error
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"message": "model '' is missing",
				"type":    "invalid_request_error",
				"param":   nil,
				"code":    nil,
			},
		})
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
	c.JSON(http.StatusNotFound, gin.H{
		"error": map[string]interface{}{
			"message": fmt.Sprintf("No accounts found for model '%s'", modelID),
			"type":    "invalid_request_error",
			"param":   nil,
			"code":    nil,
		},
	})
}

// HandleDebugModels handles /api/debug/models (returns model and account mappings)
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
	go cache.RefreshModelsCache(h.AccountDB)

	c.JSON(http.StatusOK, gin.H{
		"message": "Cache refresh triggered",
		"success": true,
	})
}
