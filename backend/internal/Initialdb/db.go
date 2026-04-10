package initialdb

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	repo "social-network-backend/internal/repository"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// Her I Will Call This Function !!

func InitDB(datasource string) {
	var err error
	repo.DB, err = sql.Open("sqlite3", datasource)
	if err != nil {
		log.Fatalf("Faile open database", err)
	}
	err = CreateTable(repo.DB)
	if err != nil {
		log.Fatalf("Faile Create Table", err)
	}

	// Hot-fix/Migration: ensure is_read column exists in messages table
	_, _ = repo.DB.Exec("ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT 0")
	_, _ = repo.DB.Exec("CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read, sender_id)")
}

func CreateTable(db *sql.DB) error {
	files, err := os.ReadDir("./database")
	if err != nil {
		return fmt.Errorf("failed to read database directory: %v", err)
	}

	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".sql") {
			continue
		}

		path := "./database/" + file.Name()
		schema, err := os.ReadFile(path)
		if err != nil {
			log.Printf("Warning: failed to read schema file %s: %v", path, err)
			continue
		}

		_, err = db.Exec(string(schema))
		if err != nil {
			return fmt.Errorf("failed to execute schema %s: %v", path, err)
		}
	}
	return nil
}
