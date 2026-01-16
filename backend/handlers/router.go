package handlers

import (
	air_router_db "air_router/db"

	"github.com/gin-gonic/gin"
)

// SetupWebRouter creates the web interface router with frontend and API routes
func SetupWebRouter(indexHandler *IndexHandler, accountHandler *AccountHandler, modelHandler *ModelHandler, proxyHandler *ProxyHandler, frontendPath string) *gin.Engine {
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
			accounts.GET("/:id/models", accountHandler.GetAccountModels)
		}

		models := api.Group("/models")
		{
			models.GET("", modelHandler.GetModels)
			models.POST("", modelHandler.CreateModel)
			models.GET("/:id", modelHandler.GetModel)
			models.PUT("/:id", modelHandler.UpdateModel)
			models.DELETE("/:id", modelHandler.DeleteModel)
			models.PATCH("/:id", modelHandler.ToggleModel)
			models.GET("/search", modelHandler.SearchModels)
		}

		// Debug routes
		api.GET("/debug/models", proxyHandler.HandleDebugModels)
		api.POST("/debug/models/reload", proxyHandler.HandleReloadModels)
	}

	return router
}

// SetupProxyRouter creates the proxy API router for /v1 routes
func SetupProxyRouter(proxyHandler *ProxyHandler) *gin.Engine {
	router := gin.Default()

	// Proxy routes - /v1/:path
	router.Any("/v1/*path", proxyHandler.HandleProxy)

	return router
}

type Handlers struct {
	IndexHandler   *IndexHandler
	AccountHandler *AccountHandler
	ModelHandler   *ModelHandler
	ProxyHandler   *ProxyHandler
}

func NewHandlers(frontendPath string, accountDB *air_router_db.AccountDB, modelDB *air_router_db.ModelDB) *Handlers {
	return &Handlers{
		IndexHandler:   NewIndexHandler(frontendPath),
		AccountHandler: NewAccountHandler(accountDB, modelDB),
		ModelHandler:   NewModelHandler(modelDB),
		ProxyHandler:   NewProxyHandler(accountDB, modelDB),
	}
}
