package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	repo "social-network-backend/internal/repository"
)
// ===> 
type PrivacyRequest struct {
	IsPrivate int `json:"is_private"` 
}

type PrivacyResponse struct {
	IsPrivate int    `json:"is_private"` // The Truth Is Her ...>
	Message   string `json:"message"`
}


func UpdatePrivacy(w http.ResponseWriter, r *http.Request) {
	fmt.Println("UpdatePrivacy called")

	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}
	var req PrivacyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	// Check Invalide !! 
	if req.IsPrivate != 0 && req.IsPrivate != 1 {
		http.Error(w, "Invalid value for is_private", http.StatusBadRequest)
		return
	}
	// Her i will set the new state to db 
	_, err := repo.DB.Exec(`UPDATE users SET is_private = ? WHERE id = ?`, req.IsPrivate, userID)
	if err != nil {
		fmt.Println("DB update error:", err)
		http.Error(w, "Failed to update privacy", http.StatusInternalServerError)
		return
	}
	//  ==== >>
	res := PrivacyResponse{
		IsPrivate: req.IsPrivate,
		Message:   "Successfully Howa Olahhe Ta Howa",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
	//fmt.Fprintln(w, "Privacy updated successfully")
}
