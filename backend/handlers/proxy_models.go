package handlers

import (
	"log"
	"net/http"
	"os"
	"sort"
	"strings"

	"air_router/cache"
	"air_router/db"
	"air_router/models"
	"air_router/utils/common"

	"github.com/gin-gonic/gin"
)

// HandleModels handles GET /v1/models (returns cached model list)
func HandleModels(c *gin.Context, modelDB *db.ModelDB) {
	// Check USE_ALL_IN_ONE environment variable using common function
	useAllInOne := common.GetEnvOrDefault("USE_ALL_IN_ONE", "true")

	if useAllInOne == "true" {
		// New logic for all-in-one mode
		handleAllInOneModels(c, modelDB)
		return
	}

	// Check if this is a Claude API request (X-Api-Key header present)
	if c.GetHeader("X-Api-Key") != "" {
		log.Printf("[Models] Claude API detected (X-Api-Key present)")
		handleClaudeModels(c)
		return
	}

	// Standard OpenAI-style API logic
	handleOpenAIModels(c)
}

// handleAllInOneModels handles models request in all-in-one mode
func handleAllInOneModels(c *gin.Context, modelDB *db.ModelDB) {
	// Check if X-Api-Key header is present to determine provider
	if c.GetHeader("X-Api-Key") != "" {
		log.Printf("[Models] All-in-one mode: Claude API detected (X-Api-Key present)")
		handleAllInOneClaudeModels(c, modelDB)
		return
	}

	log.Printf("[Models] All-in-one mode: Chat API detected (no X-Api-Key)")
	handleAllInOneChatModels(c, modelDB)
}

// handleAllInOneClaudeModels handles Claude models in all-in-one mode
func handleAllInOneClaudeModels(c *gin.Context, modelDB *db.ModelDB) {
	modelList := buildAllInOneModelList(models.ProviderClaude, modelDB)
	log.Printf("[Models] All-in-one response: %d Claude models", len(modelList))

	c.JSON(http.StatusOK, gin.H{
		"data":    modelList,
		"object":  "list",
		"success": true,
	})
}

// handleAllInOneChatModels handles Chat models in all-in-one mode
func handleAllInOneChatModels(c *gin.Context, modelDB *db.ModelDB) {
	modelList := buildAllInOneModelList(models.ProviderChat, modelDB)
	log.Printf("[Models] All-in-one response: %d Chat models", len(modelList))

	c.JSON(http.StatusOK, gin.H{
		"data":    modelList,
		"object":  "list",
		"success": true,
	})
}

// buildAllInOneModelList builds and returns models for all-in-one mode
func buildAllInOneModelList(provider models.Provider, modelDB *db.ModelDB) []cache.ModelInfo {
	// In all-in-one mode, we query the database directly for enabled models
	// instead of using the cached provider models

	modelList := make([]cache.ModelInfo, 0)

	// Get enabled models for the specific provider from the database
	enabledModels, err := modelDB.GetEnabledModelsByProvider(provider)
	if err != nil {
		log.Printf("[Models] Error getting enabled models for provider %s from database: %v", provider, err)
		return modelList
	}

	// Create pseudo model entries
	for _, model := range enabledModels {
		modelList = append(modelList, cache.ModelInfo{
			ID:                     model.ModelID,
			Object:                 "model",
			Created:                0,
			OwnedBy:                "air_router",
			SupportedEndpointTypes: []string{"openai"},
			CompatibleProviders:    []string{},
			Type:                   "",
			DisplayName:            "",
		})
	}

	sortModelsByID(modelList)
	return modelList
}

// handleClaudeModels handles Claude API requests (X-Api-Key present)
func handleClaudeModels(c *gin.Context) {
	modelList := buildClaudeModelList()
	log.Printf("[Models] Response: %d Claude models for Claude API", len(modelList))

	c.JSON(http.StatusOK, gin.H{
		"data":    modelList,
		"object":  "list",
		"success": true,
	})
}

// handleOpenAIModels handles standard OpenAI-style API requests
func handleOpenAIModels(c *gin.Context) {
	// Check DISABLE_CLAUDE environment variable
	disableClaude := os.Getenv("DISABLE_CLAUDE") == "true"

	// Check X-Enable-Claude header - if true, disable the filter
	if c.GetHeader("X-Enable-Claude") == "true" {
		disableClaude = false
	}

	// Read request body for logging
	// bodyBytes, _ := io.ReadAll(c.Request.Body)
	// log.Printf("[Models] Request body: %s", string(bodyBytes))

	modelList := buildOpenAIModelList(disableClaude)

	response := gin.H{
		"data":    modelList,
		"object":  "list",
		"success": true,
	}

	log.Printf("[Models] Response: %d models (OpenAI API)", len(modelList))
	c.JSON(http.StatusOK, response)
}

// filterClaudeAvailableAccounts returns accounts with Claude enabled
func filterClaudeAvailableAccounts() []models.Account {
	accounts := cache.GetAllAccounts()
	claudeAccounts := make([]models.Account, 0)
	for _, acc := range accounts {
		if acc.ClaudeAvailable {
			claudeAccounts = append(claudeAccounts, acc)
		}
	}
	return claudeAccounts
}

var claudeModels = []string{"claude", "glm"}

// isClaudeModel checks if a model ID indicates a Claude model
func isClaudeModel(modelID string) bool {
	for _, modelKey := range claudeModels {
		if strings.Contains(modelID, modelKey) {
			return true
		}
	}
	return false
}

// buildClaudeModelList builds and returns Claude models from claude_available accounts
func buildClaudeModelList() []cache.ModelInfo {
	modelInfos := cache.GetAllModelInfos()
	modelList := make([]cache.ModelInfo, 0)
	for _, modelInfo := range modelInfos {
		if !isClaudeModel(modelInfo.ID) {
			continue
		}

		accountNames := extractClaudeAccountNames(modelInfo.ID)
		if len(accountNames) == 0 {
			continue
		}

		modelList = append(modelList, cache.ModelInfo{
			ID:                     modelInfo.ID,
			Object:                 modelInfo.Object,
			Created:                modelInfo.Created,
			OwnedBy:                strings.Join(accountNames, ", "),
			SupportedEndpointTypes: modelInfo.SupportedEndpointTypes,
			CompatibleProviders:    modelInfo.CompatibleProviders,
			Type:                   modelInfo.Type,
			DisplayName:            modelInfo.DisplayName,
		})
	}

	sortModelsByID(modelList)
	return modelList
}

// extractClaudeAccountNames returns names of claude_available accounts for a model
func extractClaudeAccountNames(modelID string) []string {
	accounts := cache.GetAccountsForModel(modelID)
	var names []string
	for _, acc := range accounts {
		if acc.ClaudeAvailable {
			names = append(names, acc.Name)
		}
	}
	return names
}

// buildOpenAIModelList builds and returns models for OpenAI-style API
func buildOpenAIModelList(disableClaude bool) []cache.ModelInfo {
	modelInfos := cache.GetAllModelInfos()
	var modelList []cache.ModelInfo

	for _, modelInfo := range modelInfos {
		// Skip Claude models if disabled
		if disableClaude && isClaudeModel(modelInfo.ID) {
			log.Printf("[Models] Skipped model due to DISABLE_CLAUDE: %s", modelInfo.ID)
			continue
		}

		accountNames := extractAllAccountNames(modelInfo.ID)
		ownedBy := strings.Join(accountNames, ", ")
		if ownedBy == "" {
			ownedBy = modelInfo.OwnedBy
		}

		modelList = append(modelList, cache.ModelInfo{
			ID:                     modelInfo.ID,
			Object:                 modelInfo.Object,
			Created:                modelInfo.Created,
			OwnedBy:                ownedBy,
			SupportedEndpointTypes: modelInfo.SupportedEndpointTypes,
			CompatibleProviders:    modelInfo.CompatibleProviders,
			Type:                   modelInfo.Type,
			DisplayName:            modelInfo.DisplayName,
		})
	}

	sortModelsByID(modelList)
	return modelList
}

// extractAllAccountNames returns names of all accounts for a model
func extractAllAccountNames(modelID string) []string {
	accounts := cache.GetAccountsForModel(modelID)
	names := make([]string, 0, len(accounts))
	for _, acc := range accounts {
		names = append(names, acc.Name)
	}
	return names
}

// sortModelsByID sorts model list by ID
func sortModelsByID(models []cache.ModelInfo) {
	sort.Slice(models, func(i, j int) bool {
		return models[i].ID < models[j].ID
	})
}
