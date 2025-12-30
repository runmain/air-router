package cache

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"go-web-project/db"
	"go-web-project/models"
	"go-web-project/utils"
)

// ModelInfo represents a model information
type ModelInfo struct {
	ID                     string   `json:"id"`
	Object                 string   `json:"object"`
	Created                int64    `json:"created"`
	OwnedBy                string   `json:"owned_by"`
	SupportedEndpointTypes []string `json:"supported_endpoint_types"`
	CompatibleProviders    []string `json:"compatible_providers,omitempty"`
}

// ModelsCache stores the globally cached models data
// key: model id, value: list of accounts that support this model
type ModelsCache struct {
	mu     sync.RWMutex
	models map[string][]models.Account
}

// GlobalModelsCache is the global instance of models cache
var GlobalModelsCache = &ModelsCache{
	models: make(map[string][]models.Account),
}

// ModelInfoCache stores the model information for building /v1/models response
type ModelInfoCache struct {
	mu         sync.RWMutex
	modelInfos map[string]*ModelInfo
}

// GlobalModelInfoCache is the global instance of model info cache
var GlobalModelInfoCache = &ModelInfoCache{
	modelInfos: make(map[string]*ModelInfo),
}

// StartModelsCacheTask starts a background task to periodically refresh models cache
func StartModelsCacheTask(accountDB *db.AccountDB) {
	// Initial fetch
	RefreshModelsCache(accountDB)

	// Refresh every 6 hours
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		RefreshModelsCache(accountDB)
	}
}

// RefreshModelsCache fetches models from all enabled accounts and updates the cache
func RefreshModelsCache(accountDB *db.AccountDB) {
	log.Println("[ModelsCache] Starting cache refresh...")

	// Get all enabled accounts
	accounts, err := accountDB.GetEnabledAccounts()
	if err != nil {
		log.Printf("[ModelsCache] Error getting accounts: %v", err)
		return
	}

	if len(accounts) == 0 {
		log.Println("[ModelsCache] No enabled accounts found")
		return
	}

	// Create temporary map for this refresh: model id -> list of accounts
	newModels := make(map[string][]models.Account)
	// Also track model info to build the response
	modelInfoMap := make(map[string]*ModelInfo)

	// Fetch models from each account
	for _, account := range accounts {
		response, err := fetchModelsFromAccount(account)
		if err != nil {
			log.Printf("[ModelsCache] Error fetching models from account %s (ID: %d): %v", account.Name, account.ID, err)
			continue // Continue with next account
		}

		// Merge models into newModels and modelInfoMap
		for _, model := range response.Data {
			// Add account to the list for this model
			newModels[model.ID] = append(newModels[model.ID], account)

			// Store model info if not already present
			if _, ok := modelInfoMap[model.ID]; !ok {
				modelInfoMap[model.ID] = &ModelInfo{
					ID:                     model.ID,
					Object:                 model.Object,
					Created:                model.Created,
					OwnedBy:                model.OwnedBy,
					SupportedEndpointTypes: model.SupportedEndpointTypes,
					CompatibleProviders:    model.CompatibleProviders,
				}
			}
		}

		log.Printf("[ModelsCache] Fetched %d models from account %s (ID: %d)", len(response.Data), account.Name, account.ID)
	}

	// Replace the global cache with new data
	GlobalModelsCache.mu.Lock()
	GlobalModelsCache.models = newModels
	GlobalModelsCache.mu.Unlock()

	// Store model info separately for response
	GlobalModelInfoCache.mu.Lock()
	GlobalModelInfoCache.modelInfos = modelInfoMap
	GlobalModelInfoCache.mu.Unlock()

	log.Printf("[ModelsCache] Cache refresh completed. Total unique models: %d", len(newModels))
}

// fetchModelsFromAccount fetches models from a specific account's /v1/models endpoint
func fetchModelsFromAccount(account models.Account) (*ModelsResponse, error) {
	targetURL := utils.BuildTargetURL(account, "models")
	log.Printf("[ModelsCache] Fetching models from %s (ID: %d) - URL: %s", account.Name, account.ID, targetURL)

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept-Encoding", "identity")
	req.Header.Set("Authorization", "Bearer "+account.APIKey)

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Read and decompress response if needed
	var responseBody []byte
	contentEncoding := resp.Header.Get("Content-Encoding")

	if contentEncoding == "gzip" {
		gzipReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			responseBody, _ = io.ReadAll(resp.Body)
		} else {
			responseBody, err = io.ReadAll(gzipReader)
			gzipReader.Close()
			if err != nil {
				responseBody, _ = io.ReadAll(resp.Body)
			}
		}
	} else {
		responseBody, err = io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response: %w", err)
		}
	}

	var response ModelsResponse
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &response, nil
}

// ModelsResponse represents the /v1/models API response
type ModelsResponse struct {
	Data    []ModelInfo `json:"data"`
	Object  string      `json:"object"`
	Success bool        `json:"success"`
}

// GetAccountsForModel gets cached accounts for a given model ID
func GetAccountsForModel(modelID string) []models.Account {
	GlobalModelsCache.mu.RLock()
	defer GlobalModelsCache.mu.RUnlock()
	return GlobalModelsCache.models[modelID]
}

// GetAllModels returns all models (for debug routes)
func GetAllModels() map[string][]models.Account {
	GlobalModelsCache.mu.RLock()
	defer GlobalModelsCache.mu.RUnlock()
	return GlobalModelsCache.models
}

// GetAllModelInfos returns all model infos (for debug routes)
func GetAllModelInfos() map[string]*ModelInfo {
	GlobalModelInfoCache.mu.RLock()
	defer GlobalModelInfoCache.mu.RUnlock()
	return GlobalModelInfoCache.modelInfos
}
