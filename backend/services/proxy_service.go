package services

import (
	"io"
	"log"
	"math/rand"
	"net/http"

	"github.com/gin-gonic/gin"
	"go-web-project/cache"
	"go-web-project/models"
	"go-web-project/utils"
)

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

// TryWithAccount attempts to forward request to a specific account
func (s *ProxyService) TryWithAccount(c *gin.Context, account models.Account, path string, bodyBytes []byte, headers http.Header) (*http.Response, bool, []byte) {
	targetURL := utils.BuildTargetURL(account, path)

	req, err := utils.CreateProxyRequest(c.Request.Method, targetURL, bodyBytes, account, headers)
	if err != nil {
		return nil, false, nil
	}

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, false, nil
	}

	// Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
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

	log.Printf("[ProxyService] Model: %s, Accounts: %d", modelID, len(accounts))

	// Retry at most 2 times
	maxAttempts := 2
	if len(accounts) < 2 {
		maxAttempts = len(accounts)
	}

	// Random start position
	startIndex := rand.Intn(100003)

	var lastResp *http.Response
	var lastRespBody []byte

	for attempt := 0; attempt < maxAttempts; attempt++ {
		accountIndex := (startIndex + attempt) % len(accounts)
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
				log.Printf("[ProxyService] Success with account %s (ID: %d)", account.Name, account.ID)
				return true, nil, nil
			}
		}
	}

	return false, lastResp, lastRespBody
}
