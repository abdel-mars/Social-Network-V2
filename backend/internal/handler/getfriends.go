package handler


import (
	"fmt"
	"net/http"
	repo "social-network-backend/internal/repository"
	"encoding/json"
)

func GetFriendlist(w http.ResponseWriter, r *http.Request){
    fmt.Println("Fetching friends...")
    userID, ok := r.Context().Value(repo.UserIDKey).(int)
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    // Fetch All Friends Who Is Accepted Me <?> !!  
    rows, err := repo.DB.Query(`
        SELECT DISTINCT u.id, u.username, u.first_name || ' ' || ifnull(u.last_name, '') AS full_name, u.avatar
        FROM users u
        JOIN followers f ON (
            (f.follower_id = ? AND f.followed_id = u.id)
            OR
            (f.followed_id = ? AND f.follower_id = u.id)
        )
        WHERE f.status = 'accepted';
    `, userID, userID)
    if err != nil {
        http.Error(w, "Query error", http.StatusInternalServerError)
        return
    }
    type Friend struct {
        ID        int     `json:"id"`
        Username  string  `json:"username"`
        FullName  string  `json:"full_name"`
        ImagePath *string `json:"image_path"` 
    }
    var friends []Friend
	for rows.Next() {
        var f Friend
        if err := rows.Scan(&f.ID, &f.Username, &f.FullName, &f.ImagePath); err != nil {
            http.Error(w, "Failed to scan friend", http.StatusInternalServerError)
            return
        }
        friends = append(friends, f)
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(friends)
}
