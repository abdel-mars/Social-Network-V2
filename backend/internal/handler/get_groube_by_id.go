package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	key "social-network-backend/internal/repository"
	"strconv"
)

func Get_Group_By_ID(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(key.UserIDKey).(int)
	groupIDStr := r.URL.Query().Get("id")
	if groupIDStr == "" {
		http.Error(w, "Missing group id", http.StatusBadRequest)
		return
	}
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group id", http.StatusBadRequest)
		return
	}

	row := key.DB.QueryRow(`
        SELECT 
            g.id, g.title, g.description, g.creator_id,
            u.username, u.first_name, u.last_name,
            g.privacy,
            COALESCE((SELECT status FROM group_members gm2 WHERE gm2.group_id = g.id AND gm2.user_id = ?), 'not_member') as member_status,
            EXISTS (
                SELECT 1 FROM group_members gm 
                WHERE gm.group_id = g.id AND gm.user_id = ? AND gm.status = 'member'
            ) AS is_member
        FROM groups g
        JOIN users u ON g.creator_id = u.id
        WHERE g.id = ?;
    `, userID, userID, groupID)

	var group struct {
		ID           int    `json:"id"`
		Title        string `json:"title"`
		Description  string `json:"description"`
		CreatorID    int    `json:"creator_id"`
		Privacy      string `json:"privacy"`
		MemberStatus string `json:"member_status"`
		Admin        struct {
			Username  string `json:"username"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		} `json:"admin"`
		IsMember bool `json:"is_member"`
	}

	err = row.Scan(&group.ID, &group.Title, &group.Description, &group.CreatorID,
		&group.Admin.Username, &group.Admin.FirstName, &group.Admin.LastName,
		&group.Privacy, &group.MemberStatus, &group.IsMember)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	membersRows, err := key.DB.Query(`
        SELECT u.id, u.username, u.first_name, u.last_name, gm.status
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?;
    `, groupID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer membersRows.Close()
	var members []map[string]interface{}
	for membersRows.Next() {
		var id int
		var username, firstName, lastName, status string
		if err := membersRows.Scan(&id, &username, &firstName, &lastName, &status); err != nil {
			continue
		}
		members = append(members, map[string]interface{}{
			"id":         id,
			"username":   username,
			"first_name": firstName,
			"last_name":  lastName,
			"status":     status,
		})
	}

	posts := []map[string]any{}
	if group.MemberStatus == "member" {
		postsRows, err := key.DB.Query(`
            SELECT gp.id, gp.creator_id, u.username, u.first_name || ' ' || u.last_name AS full_name,
                gp.title, gp.content, gp.image, gp.created_at
            FROM group_posts gp
            JOIN users u ON gp.creator_id = u.id
            WHERE gp.group_id = ?
            ORDER BY gp.created_at DESC
        `, groupID)
		if err == nil {
			defer postsRows.Close()
			for postsRows.Next() {
				var id int
				var creatorID int
				var username string
				var fullName string
				var title string
				var content string
				var image sql.NullString
				var createdAt string
				if err := postsRows.Scan(&id, &creatorID, &username, &fullName, &title, &content, &image, &createdAt); err != nil {
					continue
				}
				post := map[string]any{
					"id":             id,
					"user_id":        creatorID,
					"user_name":      username,
					"full_name":      fullName,
					"title":          title,
					"content":        content,
					"created_at":     createdAt,
					"likes_count":    0,
					"dislikes_count": 0,
					"userReaction":   nil,
				}
				if image.Valid {
					post["image_path"] = image.String
				}
				posts = append(posts, post)
			}
		}
	}

	response := map[string]interface{}{
		"group":   group,
		"members": members,
		"posts":   posts,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
