package initialdb

import (
	"database/sql"
	"errors"
	"log"
	repo "social-network-backend/internal/repository"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

// Her I Will Call This Function !!

func InitDB(datasource string) {
	var err error
	repo.DB, err = sql.Open("sqlite3", datasource)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	driver, err := sqlite3.WithInstance(repo.DB, &sqlite3.Config{})
	if err != nil {
		log.Fatalf("Failed to instantiate sqlite3 driver: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://pkg/db/migrations/sqlite",
		"sqlite3", driver)
	if err != nil {
		log.Fatalf("Failed to initialize migration instance: %v", err)
	}

	err = m.Up()
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatalf("Failed to run migrations up: %v", err)
	}

	log.Println("Database migrations enforced successfully!")
}
