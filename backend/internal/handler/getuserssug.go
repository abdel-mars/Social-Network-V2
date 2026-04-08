package handler

import (
	"fmt"
	"net/http"
	repo "social-network-backend/internal/repository"
	"encoding/json"
	"database/sql"

)

// Getusers handles the HTTP request to return all users !!
func Getusers(w http.ResponseWriter, r *http.Request) {
	fmt.Println("hello i want the users to showing them in front ok")
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
        http.Error(w, "Username Not Found In Context", http.StatusUnauthorized)
        return
    }
	users, err := getallusers(userID)
	fmt.Println(users)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// getallusers fetches all users from the database
func getallusers(user_id int) ([]repo.Sugg, error) {
	query := `
		SELECT id, username, first_name, last_name, avatar
		FROM users
	`

	rows, err := repo.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []repo.Sugg

	for rows.Next() {
		var u repo.Sugg
		var firstName, lastName sql.NullString
		var imagePath sql.NullString

		err := rows.Scan(&u.UserID, &u.UserName, &firstName, &lastName, &imagePath)
		if err != nil {
			return nil, err
		}
		// here i will skip 
		folowthem , err  := IsFollowing(user_id, u.UserID)
		if ((user_id == u.UserID || folowthem)) {
			continue
		}
		// here it's combined full name 
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
		} else {
			u.ImagePath = nil
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}
