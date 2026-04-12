package handler

import (
	"encoding/json"
	"net/http"
	key "social-network-backend/internal/repository"
)

type GroupPostUpdateRequest struct {
	PostID  int    `json:"post_id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

type GroupPostDeleteRequest struct {
	PostID int `json:"post_id"`
}

func Update_Group_Post(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req GroupPostUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var creatorID int
	err := key.DB.QueryRow(`SELECT creator_id FROM group_posts WHERE id = ?`, req.PostID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "Group post not found", http.StatusNotFound)
		return
	}
	if creatorID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	_, err = key.DB.Exec(`
		UPDATE group_posts
		SET title = ?, content = ?
		WHERE id = ?
	`, req.Title, req.Content, req.PostID)
	if err != nil {
		http.Error(w, "Failed to update group post", http.StatusInternalServerError)
		return
	}

	post, err := GetAd_post(req.PostID)
	if err != nil {
		http.Error(w, "Failed to load updated post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

func Delete_Group_Post(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req GroupPostDeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var creatorID int
	err := key.DB.QueryRow(`SELECT creator_id FROM group_posts WHERE id = ?`, req.PostID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "Group post not found", http.StatusNotFound)
		return
	}
	if creatorID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	_, _ = key.DB.Exec(`DELETE FROM group_post_reactions WHERE group_post_id = ?`, req.PostID)
	_, _ = key.DB.Exec(`DELETE FROM group_post_comments WHERE group_post_id = ?`, req.PostID)

	_, err = key.DB.Exec(`DELETE FROM group_posts WHERE id = ?`, req.PostID)
	if err != nil {
		http.Error(w, "Failed to delete group post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"post_id": req.PostID})
}
