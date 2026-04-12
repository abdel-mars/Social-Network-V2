package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	notificationgoroutine "social-network-backend/internal/notificationGoroutine"
	repo "social-network-backend/internal/repository"
)

type GroupInviteRequest struct {
	GroupID int `json:"group_id"`
	UserID  int `json:"user_id"`
}

type GroupInviteResponse struct {
	GroupID int    `json:"group_id"`
	State   string `json:"state"`
}

func Invite_To_Group(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	senderID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req GroupInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.UserID == senderID {
		http.Error(w, "Cannot invite yourself", http.StatusBadRequest)
		return
	}

	exists, err := GroupExists(req.GroupID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	isMember, err := IsGroupMember(req.GroupID, senderID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if exists, err := GetUserExists(req.UserID); err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	} else if !exists {
		http.Error(w, "Target user not found", http.StatusBadRequest)
		return
	}

	currentStatus, err := GetGroupMemberStatus(req.GroupID, req.UserID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if currentStatus == "member" {
		http.Error(w, "Target user is already a member", http.StatusConflict)
		return
	}

	if err := EnsureGroupMembership(req.GroupID, req.UserID, "invited"); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	message := fmt.Sprintf("User %d invited you to join group %d", senderID, req.GroupID)
	id, err := AddNotification_Group(req.UserID, senderID, "group_invitation", message, req.GroupID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	notif, err := GetNotificationByID(int(id))
	if err == nil && notif != nil {
		notificationgoroutine.SendNotification(*notif)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":   "invited",
		"group_id": req.GroupID,
		"user_id":  req.UserID,
	})
}

func Respond_Group_Invite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	inviteeID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req GroupInviteResponse
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.State != "accept" && req.State != "reject" {
		http.Error(w, "Invalid state", http.StatusBadRequest)
		return
	}

	exists, err := GroupExists(req.GroupID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	status, err := GetGroupMemberStatus(req.GroupID, inviteeID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if status != "invited" {
		http.Error(w, "No pending invite found", http.StatusBadRequest)
		return
	}

	creatorID, err := GetGroupCreatorID(req.GroupID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	if req.State == "accept" {
		if err := EnsureGroupMembership(req.GroupID, inviteeID, "member"); err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		if err := UpdateInvitationNotificationState(req.GroupID, inviteeID, "accepted"); err != nil {
			fmt.Println("warning: failed to update invite notification state:", err)
		}
		responseID, err := AddNotification_Group(creatorID, inviteeID, "group_invitation_response", fmt.Sprintf("%d accepted your group invitation", inviteeID), req.GroupID)
		if err == nil {
			if notif, err := GetNotificationByID(int(responseID)); err == nil && notif != nil {
				notificationgoroutine.SendNotification(*notif)
			}
		}
	} else {
		if err := EnsureGroupMembership(req.GroupID, inviteeID, "declined"); err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		if err := UpdateInvitationNotificationState(req.GroupID, inviteeID, "rejected"); err != nil {
			fmt.Println("warning: failed to update invite notification state:", err)
		}
		responseID, err := AddNotification_Group(creatorID, inviteeID, "group_invitation_response", fmt.Sprintf("%d declined your group invitation", inviteeID), req.GroupID)
		if err == nil {
			if notif, err := GetNotificationByID(int(responseID)); err == nil && notif != nil {
				notificationgoroutine.SendNotification(*notif)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"state": req.State,
	})
}

func GetUserExists(userID int) (bool, error) {
	var id int
	err := repo.DB.QueryRow(`SELECT id FROM users WHERE id = ?`, userID).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func UpdateInvitationNotificationState(groupID, userID int, state string) error {
	_, err := repo.DB.Exec(`
		UPDATE notifications
		SET state = ?
		WHERE group_id = ? AND user_id = ? AND type = 'group_invitation'
	`, state, groupID, userID)
	return err
}

func Leave_Group(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		GroupID int `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	exists, err := GroupExists(req.GroupID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	status, err := GetGroupMemberStatus(req.GroupID, userID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if status != "member" {
		http.Error(w, "You are not a member of this group", http.StatusBadRequest)
		return
	}

	// Remove the user from the group
	_, err = repo.DB.Exec(`
		DELETE FROM group_members
		WHERE group_id = ? AND user_id = ?
	`, req.GroupID, userID)
	if err != nil {
		http.Error(w, "Failed to leave group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Successfully left the group",
	})
}

func Delete_Group(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		GroupID int `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	exists, err := GroupExists(req.GroupID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	creatorID, err := GetGroupCreatorID(req.GroupID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if creatorID != userID {
		http.Error(w, "Forbidden: Only the group creator can delete the group", http.StatusForbidden)
		return
	}

	// Delete the group (cascade will handle members and posts)
	_, err = repo.DB.Exec(`
		DELETE FROM groups
		WHERE id = ?
	`, req.GroupID)
	if err != nil {
		http.Error(w, "Failed to delete group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Successfully deleted the group",
	})
}
