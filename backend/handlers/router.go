package handlers

import (
	"github.com/gin-gonic/gin"
	go_web_project_db "go-web-project/db"
)

func SetupRouter(indexHandler *IndexHandler, accountHandler *AccountHandler, proxyHandler *ProxyHandler, frontendPath string) *gin.Engine {
	router := gin.Default()

	// Serve static files
	router.Static("/static", frontendPath)

	// Serve index page
	router.GET("/", indexHandler.ServeIndex)

	// Serve debug page
	router.GET("/debug", func(c *gin.Context) {
		c.File(frontendPath + "/debug.html")
	})

	// API routes
	api := router.Group("/api")
	{
		accounts := api.Group("/accounts")
		{
			accounts.GET("", accountHandler.GetAccounts)
			accounts.POST("", accountHandler.CreateAccount)
			accounts.GET("/:id", accountHandler.GetAccount)
			accounts.PUT("/:id", accountHandler.UpdateAccount)
			accounts.DELETE("/:id", accountHandler.DeleteAccount)
			accounts.PATCH("/:id", accountHandler.ToggleAccount)
		}

		// Debug routes
		api.GET("/debug/models", proxyHandler.HandleDebugModels)
		api.POST("/debug/models/reload", proxyHandler.HandleReloadModels)
	}

	// Proxy routes - /v1/:path
	router.Any("/v1/*path", proxyHandler.HandleProxy)

	return router
}

type Handlers struct {
	IndexHandler   *IndexHandler
	AccountHandler *AccountHandler
	ProxyHandler   *ProxyHandler
}

func NewHandlers(frontendPath string, accountDB *go_web_project_db.AccountDB) *Handlers {
	return &Handlers{
		IndexHandler:   NewIndexHandler(frontendPath),
		AccountHandler: NewAccountHandler(accountDB),
		ProxyHandler:   NewProxyHandler(accountDB),
	}
}
