package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"social-network-backend/internal/chat"
	repo "social-network-backend/internal/repository"
)

func GetGroupChatHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupIDStr := r.URL.Query().Get("group_id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Check if user is a member of the group
	isMember, err := chat.CanGroupChat(userID, groupID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Not a group member", http.StatusForbidden)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	messages, err := chat.GetGroupHistory(groupID, userID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch history", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
