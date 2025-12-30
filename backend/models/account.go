package models

// Account represents an account entity
type Account struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	BaseURL   string `json:"base_url"`
	APIKey    string `json:"api_key"`
	Enabled   bool   `json:"enabled"`
	Ext       string `json:"ext,omitempty"`
	UpdatedAt int64  `json:"updated_at"`
}
