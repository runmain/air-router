package handlers

import (
	"github.com/gin-gonic/gin"
)

type IndexHandler struct {
	FrontendPath string
}

func NewIndexHandler(frontendPath string) *IndexHandler {
	return &IndexHandler{
		FrontendPath: frontendPath,
	}
}

// ServeIndex serves the main HTML page
func (h *IndexHandler) ServeIndex(c *gin.Context) {
	c.File(h.FrontendPath + "/index.html")
}
