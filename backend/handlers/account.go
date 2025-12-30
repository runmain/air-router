package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go-web-project/db"
	"go-web-project/models"
)

type AccountHandler struct {
	AccountDB *db.AccountDB
}

func NewAccountHandler(accountDB *db.AccountDB) *AccountHandler {
	return &AccountHandler{
		AccountDB: accountDB,
	}
}

// GetAccounts handles GET /api/accounts with pagination and search support
func (h *AccountHandler) GetAccounts(c *gin.Context) {
	// Parse pagination parameters with defaults
	page := 1
	pageSize := 10

	if pageStr := c.Query("page"); pageStr != "" {
		if parsed, err := strconv.Atoi(pageStr); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if parsed, err := strconv.Atoi(pageSizeStr); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	// Parse search parameter
	search := c.Query("search")

	accounts, total, err := h.AccountDB.GetPaginatedAccounts(page, pageSize, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"accounts":    accounts,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
		"search":      search,
	})
}

// CreateAccount handles POST /api/accounts
func (h *AccountHandler) CreateAccount(c *gin.Context) {
	var account models.Account
	if err := c.ShouldBindJSON(&account); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters: " + err.Error()})
		return
	}

	if !account.Enabled && account.ID == 0 {
		account.Enabled = true
	}

	id, err := h.AccountDB.CreateAccount(account)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	account.ID = int(id)
	c.JSON(http.StatusCreated, account)
}

// GetAccount handles GET /api/accounts/:id
func (h *AccountHandler) GetAccount(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		return
	}

	account, err := h.AccountDB.GetAccount(id)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, account)
}

// UpdateAccount handles PUT /api/accounts/:id
func (h *AccountHandler) UpdateAccount(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		return
	}

	var account models.Account
	if err := c.ShouldBindJSON(&account); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters: " + err.Error()})
		return
	}

	account.ID = id
	if err := h.AccountDB.UpdateAccount(account); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, account)
}

// DeleteAccount handles DELETE /api/accounts/:id
func (h *AccountHandler) DeleteAccount(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		return
	}

	if err := h.AccountDB.DeleteAccount(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ToggleAccount handles PATCH /api/accounts/:id
func (h *AccountHandler) ToggleAccount(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		return
	}

	if err := h.AccountDB.ToggleAccount(id); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	account, err := h.AccountDB.GetAccount(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, account)
}

func parseIDParam(c *gin.Context) (int, error) {
	uri := struct {
		ID int `uri:"id" binding:"required,number"`
	}{}
	if err := c.ShouldBindUri(&uri); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return 0, err
	}
	return uri.ID, nil
}
