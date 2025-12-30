package utils

import (
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// StreamResponse streams the HTTP response to the client
func StreamResponse(c *gin.Context, resp *http.Response) error {
	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			c.Header(key, value)
		}
	}
	c.Status(resp.StatusCode)

	// Stream with small buffer for real-time response
	buf := make([]byte, 4096)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := c.Writer.Write(buf[:n])
			if writeErr != nil {
				log.Printf("Error writing response: %v", writeErr)
				break
			}
			c.Writer.Flush() // Ensure immediate flush
		}
		if err != nil {
			if err != io.EOF {
				log.Printf("Error reading response: %v", err)
			}
			break
		}
	}
	return nil
}
