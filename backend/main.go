package main

import (
	"flag"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	go_web_project_db "go-web-project/db"
	go_web_project_handlers "go-web-project/handlers"
)

var (
	// Version information (set by build flags)
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	// Seed the random number generator
	rand.Seed(time.Now().UnixNano())

	// Set gin to release mode
	gin.SetMode(gin.ReleaseMode)

	// Parse command-line flags
	configDir := flag.String("config", "./data", "Directory for data files")
	frontendPath := flag.String("path", "../frontend", "Path to frontend directory")
	port := flag.String("port", "8080", "Server port")
	flag.Parse()

	// Initialize configuration directory
	if err := initConfigDir(*configDir); err != nil {
		log.Fatal("Error creating config directory: ", err)
	}

	// Setup database path
	dbPath := filepath.Join(*configDir, "accounts.db")

	// Convert frontend path to absolute path
	absFrontendPath, err := filepath.Abs(*frontendPath)
	if err != nil {
		log.Fatal("Error resolving frontend path: ", err)
	}

	// Initialize database
	dbConn, err := go_web_project_db.InitDB(dbPath)
	if err != nil {
		log.Fatal("Error initializing database: ", err)
	}
	defer dbConn.Close()

	// Initialize account database handler
	accountDB := &go_web_project_db.AccountDB{DB: dbConn}

	// Initialize handlers
	handlers := go_web_project_handlers.NewHandlers(absFrontendPath, accountDB)

	// Setup router
	router := go_web_project_handlers.SetupRouter(handlers.IndexHandler, handlers.AccountHandler, handlers.ProxyHandler, absFrontendPath)

	// Start server
	addr := ":" + *port
	printStartupInfo(addr, absFrontendPath, dbPath)
	if err := router.Run(addr); err != nil {
		log.Fatal(err)
	}
}

// initConfigDir creates the configuration directory if it doesn't exist
func initConfigDir(dir string) error {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return nil
}

// printStartupInfo prints server startup information
func printStartupInfo(addr, frontendPath, dbPath string) {
	log.Println("================================")
	log.Println("  AI Router Server")
	log.Println("================================")
	log.Printf("  Version:    %s", Version)
	log.Printf("  Build:      %s", BuildTime)
	log.Printf("  Git Commit: %s", GitCommit)
	log.Println("--------------------------------")
	log.Printf("  Address:    http://localhost%s", addr)
	log.Printf("  Frontend:   %s", frontendPath)
	log.Printf("  Database:   %s", dbPath)
	log.Println("================================")
}
