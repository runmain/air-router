# Makefile for go-web-project

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GORUN=$(GOCMD) run
GOCLEAN=$(GOCMD) clean
GOMOD=$(GOCMD) mod
GOGET=$(GOCMD) get

# Enable CGO for SQLite3 support
CGO_ENABLED=1
export CGO_ENABLED

# Binary name and output
BINARY_NAME=air_router
BUILD_DIR=.
OUTPUT=$(BUILD_DIR)/$(BINARY_NAME)

# Version info (can be overridden at build time)
VERSION?=dev
BUILD_TIME=$(shell date +%FT%T%z)
GIT_COMMIT=$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Build flags
LDFLAGS=-ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.GitCommit=$(GIT_COMMIT)"

.PHONY: all build clean update run restart help

all: build

## build: Build the project
build:
	@echo "Building $(OUTPUT)..."
	@$(GOBUILD) $(LDFLAGS) -o $(OUTPUT) .
	@echo "Build complete: $(OUTPUT)"

## rebuild: Run clean then build
rebuild: clean build

## clean: Clean build artifacts
clean:
	@echo "Cleaning..."
	@$(GOCLEAN)
	@rm -f $(OUTPUT)
	@echo "Clean complete"

## update: Update dependencies
update:
	@echo "Updating dependencies..."
	@$(GOMOD) tidy
	@$(GOMOD) download
	@echo "Dependencies updated"

## upgrade: Upgrade all dependencies
upgrade:
	@echo "Upgrading dependencies..."
	@$(GOMOD) tidy
	@$(GET) -u ./...
	@$(GOMOD) tidy
	@echo "Dependencies upgraded"

## dev: Run with hot reload (requires air installed)
dev:
	@echo "Starting development server with hot reload..."
	@command -v air >/dev/null 2>&1 || { echo "air not installed. Install with: go install github.com/cosmtrek/air@latest"; exit 1; }
	@air


## test: Run tests
test:
	@echo "Running tests..."
	@$(GOCMD) test -v ./...

## coverage: Run tests with coverage
coverage:
	@echo "Running tests with coverage..."
	@$(GOCMD) test -coverprofile=coverage.out ./...
	@$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

## vet: Run go vet
vet:
	@echo "Running go vet..."
	@$(GOCMD) vet ./...

## fmt: Format code
fmt:
	@echo "Formatting code..."
	@$(GOCMD) fmt ./...

## lint: Run golangci-lint (requires golangci-lint installed)
lint:
	@echo "Running linter..."
	@command -v golangci-lint >/dev/null 2>&1 || { echo "golangci-lint not installed. Install with: brew install golangci-lint"; exit 1; }
	@golangci-lint run

## install-deps: Install development dependencies
install-deps:
	@echo "Installing development tools..."
	@$(GOGET) -u github.com/cosmtrek/air@latest
	@echo "Dev tools installed"

## pack: Build for multiple platforms (needs proper CGO cross-compilation setup)
pack: clean
	@echo "Building for multiple platforms..."
	@echo "Note: CGO cross-compilation requires additional setup for SQLite3"
	@mkdir -p dist
	@$(GOBUILD) $(LDFLAGS) -o dist/$(BINARY_NAME)-current .
	@echo "Binary created at dist/$(BINARY_NAME)-current"
	@echo "For proper cross-compilation, use a Docker container or configure CGO cross-compilation"

## release: Create a release build with version tag
release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=v1.0.0"; exit 1; fi
	@echo "Building release $(VERSION)..."
	@$(MAKE) clean
	@$(MAKE) build
	@echo "Release $(VERSION) built successfully"

## help: Show this help message
help:
	@echo "$(BINARY_NAME) Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E "^## " $(MAKEFILE_LIST) | sed 's/## /  /'