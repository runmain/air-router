package cache

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"air_router/db"
	"air_router/models"
	"air_router/utils"
	"air_router/utils/common"
)

// ModelInfo represents a model information
type ModelInfo struct {
	ID                     string   `json:"id"`
	Object                 string   `json:"object"`
	Created                int64    `json:"created"`
	OwnedBy                string   `json:"owned_by"`
	Type                   string   `json:"type,omitempty"`
	DisplayName            string   `json:"display_name,omitempty"`
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
var keyModelCache = []string{
	"image",
	"vedio",
	"embedding",
	"audio",
	"tools",
	"retrieval",
	"fine-tuning",
	"moderation",
	"vector",
	"claude",
	"codex",
	"nano",
	"banana",
}

// StartModelsCacheTask starts a background task to periodically refresh models cache
func StartModelsCacheTask(accountDB *db.AccountDB, modelDB *db.ModelDB) {
	// Initial fetch
	RefreshModelsCache(accountDB, modelDB)

	// Refresh every 3 hours
	ticker := time.NewTicker(3 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		RefreshModelsCache(accountDB, modelDB)
	}
}

// RefreshModelsCache fetches models from all enabled accounts and updates the cache
func RefreshModelsCache(accountDB *db.AccountDB, modelDB *db.ModelDB) {
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

	// Use WaitGroup to track goroutines
	var wg sync.WaitGroup
	// Channel to collect results from goroutines
	type fetchResult struct {
		account  models.Account
		response *ModelsResponse
		err      error
	}
	resultChan := make(chan fetchResult, len(accounts))

	// Fetch models from each account concurrently
	for _, account := range accounts {
		wg.Add(1)
		go func(acc models.Account) {
			defer wg.Done()
			response, err := fetchModelsFromAccount(acc)
			resultChan <- fetchResult{
				account:  acc,
				response: response,
				err:      err,
			}
		}(account)
	}

	// Close channel when all goroutines complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect results from channel
	for result := range resultChan {
		if result.err != nil {
			log.Printf("[ModelsCache] Error fetching models from account %s (ID: %d): %v", result.account.Name, result.account.ID, result.err)
			continue
		}

		// Merge models into newModels and modelInfoMap
		for _, model := range result.response.Data {
			// Add account to the list for this model
			newModels[model.ID] = append(newModels[model.ID], result.account)

			// Store model info if not already present
			if _, ok := modelInfoMap[model.ID]; !ok {
				modelInfoMap[model.ID] = &ModelInfo{
					ID:                     model.ID,
					Object:                 model.Object,
					Created:                model.Created,
					OwnedBy:                model.OwnedBy,
					SupportedEndpointTypes: model.SupportedEndpointTypes,
					CompatibleProviders:    model.CompatibleProviders,
					Type:                   model.Type,
					DisplayName:            model.DisplayName,
				}
			}
		}

		log.Printf("[ModelsCache] Fetched %d models from account %s (ID: %d)", len(result.response.Data), result.account.Name, result.account.ID)
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

	accounts, exists := GlobalModelsCache.models[modelID]
	if !exists || len(accounts) == 0 {
		return []models.Account{}
	}

	// Return a copy to avoid concurrent access issues
	result := make([]models.Account, len(accounts))
	copy(result, accounts)
	return result
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

// GetAllAccounts returns all unique accounts from the models cache
func GetAllAccounts() []models.Account {
	GlobalModelsCache.mu.RLock()
	defer GlobalModelsCache.mu.RUnlock()

	// Use a map to deduplicate accounts by ID
	seen := make(map[int]models.Account)
	for _, accounts := range GlobalModelsCache.models {
		for _, acc := range accounts {
			seen[acc.ID] = acc
		}
	}

	// Convert map to slice
	result := make([]models.Account, 0, len(seen))
	for _, acc := range seen {
		result = append(result, acc)
	}
	return result
}

// GetRandomModelIDByPattern returns a random model ID based on pattern matching
// Supports patterns:
// - "*" - matches any model
// - "prefix*" - matches models starting with prefix
// - "*suffix" - matches models ending with suffix
// - "*keyword*" - matches models containing keyword
// - "exact-id" - exact match (no asterisk)
// Returns error if pattern matching fails to find any models
func GetRandomModelIDByPattern(pattern string) (string, error) {
	GlobalModelsCache.mu.RLock()
	defer GlobalModelsCache.mu.RUnlock()

	if len(pattern) == 0 {
		return "", fmt.Errorf("pattern cannot be empty")
	}

	if len(GlobalModelsCache.models) == 0 {
		return "", fmt.Errorf("no models available in cache")
	}

	// Check if pattern contains asterisk
	hasAsterisk := strings.Contains(pattern, "*")

	// No asterisk - exact match
	if !hasAsterisk {
		if _, exists := GlobalModelsCache.models[pattern]; exists {
			return pattern, nil
		}
		return "", fmt.Errorf("model '%s' not found in cache", pattern)
	}

	// Parse pattern with asterisk
	trimmed := strings.Trim(pattern, "*")

	// Check for invalid patterns (asterisk in the middle)
	if strings.Contains(trimmed, "*") {
		return "", fmt.Errorf("pattern '%s' is invalid: asterisk (*) can only be at the beginning or end", pattern)
	}

	// Special case: "*" matches any model
	if pattern == "*" {
		return getRandomModelFromCache(), nil
	}

	// Empty content between asterisks (e.g., "**")
	if len(trimmed) == 0 {
		return "", fmt.Errorf("pattern '%s' is invalid: must have content between asterisks", pattern)
	}

	// Determine match type
	keyword := strings.ToLower(trimmed)

	// Find matching models
	var matches []string
	for modelID := range GlobalModelsCache.models {
		if strings.Contains(strings.ToLower(modelID), keyword) && valid(keyword, strings.ToLower(modelID)) {
			matches = append(matches, modelID)
		}
	}

	if len(matches) == 0 {
		return "", fmt.Errorf("no models found matching pattern '%s'", pattern)
	}

	if len(matches) == 1 {
		return matches[0], nil
	}

	index := common.GetRandomIndex(len(matches))
	return matches[index], nil
}

// valid checks if a keyword-model pair is valid based on cache filtering rules
// Returns true if the keyword contains any cache key OR if the model ID doesn't contain any cache key
// This implements a filtering mechanism to exclude certain model types from matching
// This prevents specialized models (image, video, embedding, etc.) from matching generic patterns like "gpt*"
// but maybe error if keyword like gpt-image on some condition
func valid(keyword, modelID string) bool {
	// If keyword contains any cache key (image, video, embedding, etc.), allow it
	for _, key := range keyModelCache {
		if strings.Contains(keyword, key) {
			return true
		}
	}
	// If model ID contains any cache key, reject it (filter out specialized models)
	for _, key := range keyModelCache {
		if strings.Contains(modelID, key) {
			return false
		}
	}
	// Default: allow if neither keyword nor model ID contains cache keys
	return true
}

// getRandomModelFromCache returns a random model ID from cache
func getRandomModelFromCache() string {
	if len(GlobalModelsCache.models) == 1 {
		for modelID := range GlobalModelsCache.models {
			return modelID
		}
	}

	allModels := make([]string, 0, len(GlobalModelsCache.models))
	for modelID := range GlobalModelsCache.models {
		allModels = append(allModels, modelID)
	}

	index := common.GetRandomIndex(len(allModels))
	return allModels[index]
}

// FetchModelsFromAccountAPI fetches models directly from an account's /v1/models endpoint
// Returns a list of model IDs
func FetchModelsFromAccountAPI(account models.Account) ([]string, error) {
	response, err := fetchModelsFromAccount(account)
	if err != nil {
		return nil, err
	}

	modelIDs := make([]string, 0, len(response.Data))
	for _, model := range response.Data {
		modelIDs = append(modelIDs, model.ID)
	}

	return modelIDs, nil
}
