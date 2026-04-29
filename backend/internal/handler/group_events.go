package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	key "social-network-backend/internal/repository"
)

type GroupEventCreateRequest struct {
	GroupID     int    `json:"group_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	EventDate   string `json:"event_date"`
}

type GroupEventRespondRequest struct {
	EventID  int    `json:"event_id"`
	Response string `json:"response"`
}

type GroupEventDeleteRequest struct {
	EventID int `json:"event_id"`
}

func Create_Group_Event(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(key.UserIDKey).(int)

	var req GroupEventCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Description == "" || req.EventDate == "" {
		http.Error(w, "Missing fields", http.StatusBadRequest)
		return
	}

	var isMember bool
	err := key.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'member')", req.GroupID, userID).Scan(&isMember)
	if err != nil || !isMember {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	res, err := key.DB.Exec(`
		INSERT INTO group_events (group_id, creator_id, title, description, event_date)
		VALUES (?, ?, ?, ?, ?)
	`, req.GroupID, userID, req.Title, req.Description, req.EventDate)

	if err != nil {
		http.Error(w, "Failed to create event", http.StatusInternalServerError)
		return
	}
	eventID, _ := res.LastInsertId()

	// Notify all group members about the new event
	rows, err := key.DB.Query("SELECT user_id FROM group_members WHERE group_id = ? AND status = 'member' AND user_id != ?", req.GroupID, userID)
	if err == nil {
		defer rows.Close()
		message := fmt.Sprintf("A new event '%s' was created in group %d", req.Title, req.GroupID)
		for rows.Next() {
			var memberID int
			if err := rows.Scan(&memberID); err == nil {
				AddNotification_Group(memberID, userID, "group_event_created", message, req.GroupID)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      eventID,
		"message": "Event created successfully",
	})
}

func Respond_Group_Event(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(key.UserIDKey).(int)

	var req GroupEventRespondRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Response != "going" && req.Response != "not_going" {
		http.Error(w, "Invalid response option", http.StatusBadRequest)
		return
	}

	// Verify user is in group
	var groupID int
	err := key.DB.QueryRow("SELECT group_id FROM group_events WHERE id = ?", req.EventID).Scan(&groupID)
	if err != nil {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	var isMember bool
	err = key.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'member')", groupID, userID).Scan(&isMember)
	if err != nil || !isMember {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Upsert response
	_, err = key.DB.Exec(`
		INSERT INTO group_event_responses (event_id, user_id, response)
		VALUES (?, ?, ?)
		ON CONFLICT(event_id, user_id) DO UPDATE SET response = excluded.response
	`, req.EventID, userID, req.Response)

	if err != nil {
		http.Error(w, "Failed to respond to event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Response recorded",
		"response": req.Response,
	})
}

func Delete_Group_Event(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(key.UserIDKey).(int)

	var req GroupEventDeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.EventID == 0 {
		http.Error(w, "Missing event_id", http.StatusBadRequest)
		return
	}

	// Verify event exists and get creator_id and group_id
	var creatorID, groupID int
	err := key.DB.QueryRow("SELECT creator_id, group_id FROM group_events WHERE id = ?", req.EventID).Scan(&creatorID, &groupID)
	if err != nil {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	// Check if the user is the event creator
	if userID != creatorID {
		http.Error(w, "Forbidden: Only event creator can delete this event", http.StatusForbidden)
		return
	}

	// Delete the event (cascade will delete associated responses)
	_, err = key.DB.Exec("DELETE FROM group_events WHERE id = ?", req.EventID)
	if err != nil {
		http.Error(w, "Failed to delete event", http.StatusInternalServerError)
		return
	}

	// Notify group members about the deleted event
	rows, err := key.DB.Query("SELECT user_id FROM group_members WHERE group_id = ? AND status = 'member' AND user_id != ?", groupID, userID)
	if err == nil {
		defer rows.Close()
		message := fmt.Sprintf("An event was deleted from the group")
		for rows.Next() {
			var memberID int
			if err := rows.Scan(&memberID); err == nil {
				AddNotification_Group(memberID, userID, "group_event_deleted", message, groupID)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Event deleted successfully",
	})
}
