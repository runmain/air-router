package utils

import (
	"bytes"
	"net/http"

	"go-web-project/models"
)

// CreateProxyRequest creates an HTTP request for proxying
func CreateProxyRequest(method, targetURL string, bodyBytes []byte, account models.Account, headers http.Header) (*http.Request, error) {
	req, err := http.NewRequest(method, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept-Encoding", "identity")
	for key, values := range headers {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}
	req.Header.Set("Authorization", "Bearer "+account.APIKey)

	return req, nil
}
