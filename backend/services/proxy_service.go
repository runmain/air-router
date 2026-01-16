package services

import (
	"crypto/rand"
	"io"
	"log"
	"math/big"
	"net/http"
	"strings"

	"air_router/cache"
	"air_router/models"
	"air_router/utils"
	"air_router/utils/common"

	"github.com/gin-gonic/gin"
)

// Global counter for randomized account selection
var globalAccountCounter uint64

// GetGlobalAccountCounter returns the global account counter for external access
func GetGlobalAccountCounter() *uint64 {
	return &globalAccountCounter
}

// Claude API paths that require special handling
var claudePaths = []string{"/messages", "/messages/batches", "/files", "/skills"}

func init() {
	// Initialize with a secure random number between 10w and 20w
	n, _ := rand.Int(rand.Reader, big.NewInt(100000))
	globalAccountCounter = 100000 + n.Uint64()
}

// ProxyService handles proxy request routing and retry logic
type ProxyService struct {
	HTTPClient *http.Client
}

// NewProxyService creates a new ProxyService
func NewProxyService() *ProxyService {
	return &ProxyService{
		HTTPClient: utils.HTTPClient,
	}
}

// IsClaudeAPI checks if the path is a Claude API endpoint
func IsClaudeAPI(path string) bool {
	for _, claudePath := range claudePaths {
		if strings.Contains(path, claudePath) {
			return true
		}
	}
	return false
}

// TryWithAccount attempts to forward request to a specific account
func (s *ProxyService) TryWithAccount(c *gin.Context, account models.Account, path string, bodyBytes []byte, headers http.Header) (*http.Response, bool, []byte) {
	targetURL := utils.BuildTargetURL(account, path)

	isClaude := IsClaudeAPI(path)
	req, err := utils.CreateProxyRequest(c.Request.Method, targetURL, bodyBytes, account, headers, isClaude)
	if err != nil {
		return nil, false, nil
	}

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		log.Printf("[TryWithAccount /v1%s] request error from account %s (ID: %d)", path, account.Name, account.ID)
		return nil, false, nil
	}

	// Check status code
	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		log.Printf("[TryWithAccount /v1%s] response error : %s", path, string(bodyBytes))
		return resp, false, bodyBytes
	}

	return resp, true, nil
}

// TryWithRetryModel attempts to forward request using accounts that support the model
// Returns (success, lastResponse, lastResponseBody)
func (s *ProxyService) TryWithRetryModel(c *gin.Context, path string, modelID string, bodyBytes []byte) (bool, *http.Response, []byte) {
	accounts := cache.GetAccountsForModel(modelID)
	if len(accounts) == 0 {
		return false, nil, nil
	}

	// Check if this is a Claude API request
	isClaude := IsClaudeAPI(path)
	if isClaude {
		log.Printf("[ProxyService] Claude API detected, filtering claude_available accounts")
	}

	// Filter accounts for Claude API if needed
	var availableAccounts []models.Account
	if isClaude {
		for _, acc := range accounts {
			if acc.ClaudeAvailable {
				availableAccounts = append(availableAccounts, acc)
			}
		}
		if len(availableAccounts) == 0 {
			log.Printf("[ProxyService] No Claude available accounts found for model %s", modelID)
			return false, nil, nil
		}
		accounts = availableAccounts
	}

	log.Printf("[ProxyService] Model: %s, Accounts: %d, IsClaude: %v", modelID, len(accounts), isClaude)

	// Retry at most 2 times
	maxAttempts := 2
	if len(accounts) < 2 {
		maxAttempts = len(accounts)
	}

	var lastResp *http.Response
	var lastRespBody []byte

	for attempt := 0; attempt < maxAttempts; attempt++ {
		// Use common function to get random index and handle counter reset
		accountIndex := common.GetRandomIndex(len(accounts))
		account := accounts[accountIndex]

		log.Printf("[ProxyService] Attempt %d/%d with account %s (ID: %d)", attempt+1, maxAttempts, account.Name, account.ID)

		resp, success, respBody := s.TryWithAccount(c, account, path, bodyBytes, c.Request.Header)
		if resp != nil {
			// Keep track of last response
			lastResp = resp
			lastRespBody = respBody

			defer resp.Body.Close()
			if success {
				// Stream response
				utils.StreamResponse(c, resp)
				log.Printf("[ProxyService] Success with account %s (ID: %d)", account.BaseURL, account.ID)
				return true, nil, nil
			}
		}
	}

	return false, lastResp, lastRespBody
}
