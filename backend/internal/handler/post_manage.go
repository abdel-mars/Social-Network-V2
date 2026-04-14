package handler

import (
	"encoding/json"
	"net/http"
	key "social-network-backend/internal/repository"
	set "social-network-backend/internal/set_get_data_base"
)

type PostUpdateRequest struct {
	PostID    int    `json:"post_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Privacy   string `json:"privacy"`
	ViewerIDs []int  `json:"viewer_ids"`
}

type PostDeleteRequest struct {
	PostID int `json:"post_id"`
}

func Update_Post(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req PostUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var ownerID int
	err := key.DB.QueryRow(`SELECT user_id FROM posts WHERE id = ?`, req.PostID).Scan(&ownerID)
	if err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if req.Privacy == "" {
		req.Privacy = "public"
	}

	_, err = key.DB.Exec(`
		UPDATE posts
		SET title = ?, content = ?, privacy = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Title, req.Content, req.Privacy, req.PostID)
	if err != nil {
		http.Error(w, "Failed to update post", http.StatusInternalServerError)
		return
	}

	// Always clear out old viewers to avoid stale relations
	key.DB.Exec("DELETE FROM post_viewers WHERE post_id = ?", req.PostID)

	if req.Privacy == "private" && len(req.ViewerIDs) > 0 {
		for _, viewerID := range req.ViewerIDs {
			key.DB.Exec("INSERT INTO post_viewers (post_id, user_id) VALUES (?, ?)", req.PostID, viewerID)
		}
	}

	post, err := set.GetAddedPost(req.PostID)
	if err != nil {
		http.Error(w, "Failed to load updated post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

func Delete_Post(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req PostDeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var ownerID int
	err := key.DB.QueryRow(`SELECT user_id FROM posts WHERE id = ?`, req.PostID).Scan(&ownerID)
	if err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	_, _ = key.DB.Exec(`DELETE FROM reactions WHERE post_id = ?`, req.PostID)
	_, _ = key.DB.Exec(`DELETE FROM comments WHERE post_id = ?`, req.PostID)

	_, err = key.DB.Exec(`DELETE FROM posts WHERE id = ?`, req.PostID)
	if err != nil {
		http.Error(w, "Failed to delete post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"post_id": req.PostID})
}
