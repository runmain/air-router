package db

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

// InitDB initializes the database, creates tables if they don't exist
// and returns the database connection
func InitDB(dbPath string) (*sql.DB, error) {
	conn, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	// Test the connection
	if err := conn.Ping(); err != nil {
		conn.Close()
		return nil, err
	}

	// Create accounts table if it doesn't exist
	if err := createTables(conn); err != nil {
		conn.Close()
		return nil, err
	}

	return conn, nil
}

// createTables creates all necessary tables in the database
func createTables(conn *sql.DB) error {
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS accounts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		base_url TEXT NOT NULL,
		api_key TEXT NOT NULL,
		enabled BOOLEAN NOT NULL DEFAULT true,
		ext TEXT,
		updated_at INTEGER NOT NULL DEFAULT 0
	);`

	if _, err := conn.Exec(createTableQuery); err != nil {
		return err
	}

	return nil
}
