package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"social-network-backend/internal/chat"
	repo "social-network-backend/internal/repository"
)

type DataGroups struct {
	Id          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Privacy     string `json:"privacy"`
	Avatar      string `json:"avatar"`
	OnlineCount int    `json:"online_count"`
	UserStatus  string `json:"user_status"`
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
		SELECT g.id, g.title, g.description, g.privacy, g.avatar, gm.status
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
		var privacy string

		err := rows.Scan(&group.Id, &group.Name, &group.Description, &privacy, &group.Avatar, &status)
		if err != nil {
			http.Error(w, "Error scanning group", http.StatusInternalServerError)
			fmt.Println("Scan Error:", err)
			return
		}
		if status.Valid {
			group.UserStatus = status.String
		} else {
			group.UserStatus = "not_member"
		}
		group.Privacy = privacy

		// Calculate online count
		if chat.ChatHub != nil {
			members, err := chat.GetGroupMembers(group.Id)
			if err == nil {
				for _, memberID := range members {
					if chat.ChatHub.IsUserOnline(memberID) {
						group.OnlineCount++
					}
				}
			}
		}

		groups = append(groups, group)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}
