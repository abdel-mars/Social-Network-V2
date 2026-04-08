package initialdb

import (
	"database/sql"
	repo "social-network-backend/internal/repository"
	"log"
	"os"
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
}

func CreateTable(db *sql.DB) error {
	schema, err := os.ReadFile("./database/schema.sql")
	if err != nil {
		return err
	}
	_, err = db.Exec(string(schema))
	return err
}