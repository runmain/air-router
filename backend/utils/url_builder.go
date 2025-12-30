package utils

import (
	"net/url"
	"strings"

	"go-web-project/models"
)

// BuildTargetURL constructs the target API URL from account and path
func BuildTargetURL(account models.Account, path string) string {
	baseURL := strings.TrimSuffix(account.BaseURL, "/")

	// Check if baseURL already contains a path component like /v1, /v1beta, /api, etc.
	parsedURL, err := url.Parse(baseURL)
	if err == nil && parsedURL.Path != "" && parsedURL.Path != "/" {
		// BaseURL already has a path, append the path directly
		if strings.HasPrefix(path, "/") {
			return baseURL + path
		}
		return baseURL + "/" + path
	}

	// BaseURL is just domain/ip:port, append /v1
	if strings.HasPrefix(path, "/") {
		return baseURL + "/v1" + path
	}
	return baseURL + "/v1/" + path
}
