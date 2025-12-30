package handlers

import (
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"go-web-project/cache"
)

// HandleModels handles GET /v1/models (returns cached model list)
func HandleModels(c *gin.Context) {
	// Check DISABLE_CLAUDE environment variable
	disableClaude := os.Getenv("DISABLE_CLAUDE") == "true"

	// Check X-Enable-Claude header - if true, disable the filter
	if c.GetHeader("X-Enable-Claude") == "true" {
		disableClaude = false
	}

	// Read request body for logging
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	log.Printf("[Models] Request body: %s", string(bodyBytes))

	// Get cached model infos
	modelInfos := cache.GetAllModelInfos()

	var modelList []cache.ModelInfo
	for _, modelInfo := range modelInfos {
		// Skip models containing "claude" if DISABLE_CLAUDE is true
		if disableClaude && strings.Contains(strings.ToLower(modelInfo.ID), "claude") {
			log.Printf("[Models] Skipped model due to DISABLE_CLAUDE: %s", modelInfo.ID)
			continue
		}

		// Get accounts for this model to show as owners
		accounts := cache.GetAccountsForModel(modelInfo.ID)
		accountNames := make([]string, 0, len(accounts))
		for _, acc := range accounts {
			accountNames = append(accountNames, acc.Name)
		}
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
		})
	}

	// Sort by ID
	sort.Slice(modelList, func(i, j int) bool {
		return modelList[i].ID < modelList[j].ID
	})

	response := gin.H{
		"data":    modelList,
		"object":  "list",
		"success": true,
	}

	log.Printf("[Models] Response: %d models (filtered if DISABLE_CLAUDE=true)", len(modelList))

	c.JSON(http.StatusOK, response)
}
