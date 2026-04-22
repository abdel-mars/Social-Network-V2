package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	repo "social-network-backend/internal/repository"
)

// SearchUsers handles the HTTP request to search for users based on query
func SearchUsers(w http.ResponseWriter, r *http.Request) {
	queryParam := r.URL.Query().Get("q")
	queryParam = strings.TrimSpace(queryParam)

	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if queryParam == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]repo.Sugg{})
		return
	}

	searchStr := "%" + queryParam + "%"

	query := `
		SELECT id, username, first_name, last_name, avatar
		FROM users
		WHERE (username LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
		  AND id != ?
		LIMIT 15
	`

	rows, err := repo.DB.Query(query, searchStr, searchStr, searchStr, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []repo.Sugg

	for rows.Next() {
		var u repo.Sugg
		var firstName, lastName sql.NullString
		var imagePath sql.NullString

		if err := rows.Scan(&u.UserID, &u.UserName, &firstName, &lastName, &imagePath); err != nil {
			http.Error(w, "Error parsing results", http.StatusInternalServerError)
			return
		}

		// Combined full name
		fullName := ""
		if firstName.Valid {
			fullName += firstName.String
		}
		if lastName.Valid {
			if fullName != "" {
				fullName += " "
			}
			fullName += lastName.String
		}
		u.FullName = fullName

		if imagePath.Valid {
			u.ImagePath = &imagePath.String
		}

		users = append(users, u)
	}

	if users == nil {
		users = []repo.Sugg{} // return empty array instead of null
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
