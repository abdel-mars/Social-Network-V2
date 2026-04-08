package handler

import (
	"fmt"
	"net/http"
	repo "social-network-backend/internal/repository"
	"encoding/json"
	"database/sql"
)

type DataGroups struct{
	Id int `json:"id"`
	Name string `json:"name"`
	Description string `json:"description"`
	UserStatus string `json:"user_status"`
}

func Get_Groups(w http.ResponseWriter, r *http.Request) {

	fmt.Println("Fetching all groups with user membership status...")
	// Her I Will Get The Current User Who Want To Get This Data <!!
	UserID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
        http.Error(w, "Internal server errro", http.StatusUnauthorized)
        return
    }
	db := repo.DB
	rows, err := db.Query(`
		SELECT g.id, g.title, g.description, gm.status
		FROM groups g
		LEFT JOIN (
			SELECT group_id, status
			FROM group_members
			WHERE user_id = ?
			GROUP BY group_id
		) gm ON gm.group_id = g.id
	`, UserID)
	if err != nil {
		http.Error(w, "Failed to fetch groups", http.StatusInternalServerError)
		fmt.Println("Query Error:", err)
		return
	}
	defer rows.Close()
	var groups []DataGroups
	for rows.Next() {
		var group DataGroups
		var status sql.NullString

		err := rows.Scan(&group.Id, &group.Name, &group.Description, &status)
		if err != nil {
			http.Error(w, "Error scanning group", http.StatusInternalServerError)
			fmt.Println("Scan Error:", err)
			return
		}
		if status.Valid {
			group.UserStatus = status.String
		}else {
			group.UserStatus = "not_member"
		}
		groups = append(groups, group)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}