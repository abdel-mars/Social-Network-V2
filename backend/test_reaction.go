//go:build ignore

// Standalone scratch script, not part of the server build.
// Run manually with: go run test_reaction.go

package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "database/forum.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec("INSERT INTO message_reactions (message_id, user_id) VALUES (?, ?)", 1, 1)
	if err != nil {
		fmt.Println("Error inserting:", err)
	} else {
		fmt.Println("Success")
	}
}
