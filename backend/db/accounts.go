package db

import (
	"database/sql"
	"fmt"
	"go-web-project/models"
	"time"
)

// AccountDB represents the database operations for accounts
type AccountDB struct {
	DB *sql.DB
}

// AccountNameExists checks if an account with the given name already exists
func (a *AccountDB) AccountNameExists(name string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM accounts WHERE name = ?`
	err := a.DB.QueryRow(query, name).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// AccountNameExistsExcludingID checks if an account with the given name already exists, excluding the specified ID
func (a *AccountDB) AccountNameExistsExcludingID(name string, id int) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM accounts WHERE name = ? AND id != ?`
	err := a.DB.QueryRow(query, name, id).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CreateAccount inserts a new account into the database
func (a *AccountDB) CreateAccount(account models.Account) (int64, error) {
	// Check if an account with the same name already exists
	exists, err := a.AccountNameExists(account.Name)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, fmt.Errorf("account with name '%s' already exists", account.Name)
	}

	// Set updated_at to current time in milliseconds
	updatedAt := time.Now().UnixMilli()

	query := `INSERT INTO accounts (name, base_url, api_key, enabled, ext, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
	result, err := a.DB.Exec(query, account.Name, account.BaseURL, account.APIKey, account.Enabled, account.Ext, updatedAt)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return id, nil
}

// GetAccounts retrieves all accounts from the database
func (a *AccountDB) GetAccounts() ([]models.Account, error) {
	query := `SELECT id, name, base_url, api_key, enabled, ext, updated_at FROM accounts`
	rows, err := a.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []models.Account
	for rows.Next() {
		var account models.Account
		err := rows.Scan(&account.ID, &account.Name, &account.BaseURL, &account.APIKey, &account.Enabled, &account.Ext, &account.UpdatedAt)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, nil
}

// GetEnabledAccounts retrieves all enabled accounts from the database
func (a *AccountDB) GetEnabledAccounts() ([]models.Account, error) {
	query := `SELECT id, name, base_url, api_key, enabled, ext, updated_at FROM accounts WHERE enabled = 1`
	rows, err := a.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []models.Account
	for rows.Next() {
		var account models.Account
		err := rows.Scan(&account.ID, &account.Name, &account.BaseURL, &account.APIKey, &account.Enabled, &account.Ext, &account.UpdatedAt)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, nil
}

// GetAccount retrieves a specific account by ID
func (a *AccountDB) GetAccount(id int) (models.Account, error) {
	var account models.Account
	query := `SELECT id, name, base_url, api_key, enabled, ext, updated_at FROM accounts WHERE id = ?`
	err := a.DB.QueryRow(query, id).Scan(&account.ID, &account.Name, &account.BaseURL, &account.APIKey, &account.Enabled, &account.Ext, &account.UpdatedAt)
	if err != nil {
		return account, err
	}

	return account, nil
}

// UpdateAccount updates an existing account
func (a *AccountDB) UpdateAccount(account models.Account) error {
	// Check if another account with the same name already exists
	exists, err := a.AccountNameExistsExcludingID(account.Name, account.ID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("account with name '%s' already exists", account.Name)
	}

	// Set updated_at to current time in milliseconds
	updatedAt := time.Now().UnixMilli()

	query := `UPDATE accounts SET name = ?, base_url = ?, api_key = ?, enabled = ?, ext = ?, updated_at = ? WHERE id = ?`
	_, err = a.DB.Exec(query, account.Name, account.BaseURL, account.APIKey, account.Enabled, account.Ext, updatedAt, account.ID)
	return err
}

// GetPaginatedAccounts retrieves accounts with pagination and optional search by name
func (a *AccountDB) GetPaginatedAccounts(page, pageSize int, search string) ([]models.Account, int, error) {
	// Build query with optional search condition
	countQuery := `SELECT COUNT(*) FROM accounts`
	query := `SELECT id, name, base_url, api_key, enabled, ext, updated_at FROM accounts`
	var args []interface{}

	if search != "" {
		searchPattern := "%" + search + "%"
		countQuery += ` WHERE name LIKE ?`
		query += ` WHERE name LIKE ? ORDER BY id DESC`
		args = append(args, searchPattern)
	} else {
		query += ` ORDER BY id DESC`
	}

	// Get total count
	var total int
	if len(args) > 0 {
		err := a.DB.QueryRow(countQuery, args...).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
	} else {
		err := a.DB.QueryRow(countQuery).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	// Get paginated accounts
	query += ` LIMIT ? OFFSET ?`
	args = append(args, pageSize, offset)

	rows, err := a.DB.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var accounts []models.Account
	for rows.Next() {
		var account models.Account
		err := rows.Scan(&account.ID, &account.Name, &account.BaseURL, &account.APIKey, &account.Enabled, &account.Ext, &account.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		accounts = append(accounts, account)
	}

	return accounts, total, nil
}

// DeleteAccount deletes an account by ID
func (a *AccountDB) DeleteAccount(id int) error {
	query := `DELETE FROM accounts WHERE id = ?`
	_, err := a.DB.Exec(query, id)
	return err
}

// ToggleAccount toggles the enabled status of an account
func (a *AccountDB) ToggleAccount(id int) error {
	// First get the current status
	var enabled bool
	query := `SELECT enabled FROM accounts WHERE id = ?`
	err := a.DB.QueryRow(query, id).Scan(&enabled)
	if err != nil {
		return err
	}

	// Toggle the status and update updated_at
	newEnabled := !enabled
	updatedAt := time.Now().UnixMilli()
	updateQuery := `UPDATE accounts SET enabled = ?, updated_at = ? WHERE id = ?`
	_, err = a.DB.Exec(updateQuery, newEnabled, updatedAt, id)
	return err
}
