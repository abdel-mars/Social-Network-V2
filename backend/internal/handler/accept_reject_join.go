package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	notificationgoroutine "social-network-backend/internal/notificationGoroutine"
	repo "social-network-backend/internal/repository"
)

type JoinRequestDetails struct {
	GroupID int    `json:"group_id"`
	UserID  int    `json:"user_id"`
	State   string `json:"state"`
}

func Accept_or_reject_join(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	// Step 1: Decode JSON body
	var req JoinRequestDetails
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	currentUserID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	creatorID, err := GetGroupCreatorID(req.GroupID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	if creatorID != currentUserID {
		http.Error(w, "Only group owner can approve join requests", http.StatusForbidden)
		return
	}

	requestedStatus, err := GetGroupMemberStatus(req.GroupID, req.UserID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if requestedStatus != "requested" {
		http.Error(w, "No pending join request for this user", http.StatusBadRequest)
		return
	}

	if req.State != "accept" && req.State != "reject" {
		http.Error(w, "Invalid state", http.StatusBadRequest)
		return
	}
	if ok, err := IsGroupMember(req.GroupID, currentUserID); err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	} else if !ok {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	// Step 2: Print for debugging (you'll handle DB logic later)
	fmt.Printf("Received Join Request: group_id=%d, user_id=%d, state=%s\n",
		req.GroupID, req.UserID, req.State)
	// After i get the status from front i will check the state from them i will decide what's i will do
	if req.State == "accept" {
		fmt.Println("the state it's acceptted")
		// Add Them As Member !!
		if err := UpdateGroupMemberStatus(req.UserID, req.GroupID, "member"); err != nil {
			http.Error(w, "Failed to accept join request", http.StatusInternalServerError)
			return
		}
		if err := DeleteJoinRequestNotification(req.GroupID, req.UserID); err != nil {
			fmt.Println("warning: failed to remove pending join request notification:", err)
		}
		if err := UpdateJoinRequestNotificationState(req.GroupID, req.UserID, "accepted"); err != nil {
			fmt.Println("warning: failed to update join request notification state:", err)
		}
		responseID, err := AddNotification_Group(req.UserID, currentUserID, "group_join_response", fmt.Sprintf("Your request to join group %d was accepted", req.GroupID), req.GroupID)
		if err == nil {
			if notif, err := GetNotificationByID(int(responseID)); err == nil && notif != nil {
				notificationgoroutine.SendNotification(*notif)
			}
		}
	} else if req.State == "reject" {
		// I Will Remove Them From Table !!
		if err := DeleteGroupMember(req.UserID, req.GroupID); err != nil {
			http.Error(w, "Failed to reject join request", http.StatusInternalServerError)
			return
		}
		if err := DeleteJoinRequestNotification(req.GroupID, req.UserID); err != nil {
			fmt.Println("warning: failed to remove pending join request notification:", err)
		}
		if err := UpdateJoinRequestNotificationState(req.GroupID, req.UserID, "rejected"); err != nil {
			fmt.Println("warning: failed to update join request notification state:", err)
		}
		responseID, err := AddNotification_Group(req.UserID, currentUserID, "group_join_response", fmt.Sprintf("Your request to join group %d was rejected", req.GroupID), req.GroupID)
		if err == nil {
			if notif, err := GetNotificationByID(int(responseID)); err == nil && notif != nil {
				notificationgoroutine.SendNotification(*notif)
			}
		}
		// I Will Remove ...
		// i will the current user who is now it's the owner of notificaion \
		// i wiil remove the notificaion wher the user iD of reciver is
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"state": req.State,
	})
}

func UpdateGroupMemberStatus(userID, groupID int, newStatus string) error {
	result, err := repo.DB.Exec(`
        UPDATE group_members 
        SET status = ?
        WHERE user_id = ? AND group_id = ?
    `, newStatus, userID, groupID)

	if err != nil {
		return fmt.Errorf("failed to update group member status: %v", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %v", err)
	}

	if rows == 0 {
		return fmt.Errorf("no record found for user_id=%d and group_id=%d", userID, groupID)
	}
	fmt.Printf("Updated group member status to %s for user_id=%d in group_id=%d\n", newStatus, userID, groupID)
	return nil
}

func DeleteGroupMember(userID, groupID int) error {
	result, err := repo.DB.Exec(`
		DELETE FROM group_members
		WHERE user_id = ? AND group_id = ?
	`, userID, groupID)
	if err != nil {
		return fmt.Errorf("failed to delete group member: %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %v", err)
	}
	if rows == 0 {
		return fmt.Errorf("no record found for user_id=%d and group_id=%d", userID, groupID)
	}
	fmt.Printf("Deleted member user_id=%d from group_id=%d\n", userID, groupID)
	return nil
}

func DeleteJoinRequestNotification(groupID, senderID int) error {
	result, err := repo.DB.Exec(`
		DELETE FROM notifications
		WHERE group_id = ? 
		  AND sender_id = ? 
		  AND type IN ('request_join_groub', 'group_join_request')
	`, groupID, senderID)
	if err != nil {
		return fmt.Errorf("failed to delete join request notification: %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check affected rows: %v", err)
	}
	if rows == 0 {
		fmt.Printf("No matching join request notification found for group_id=%d, sender_id=%d\n", groupID, senderID)
	} else {
		fmt.Printf(" Deleted %d join request notification(s) for group_id=%d, sender_id=%d\n", rows, groupID, senderID)
	}
	return nil
}

func UpdateJoinRequestNotificationState(groupID, senderID int, state string) error {
	_, err := repo.DB.Exec(`
		UPDATE notifications
		SET state = ?
		WHERE group_id = ? AND sender_id = ? AND type IN ('request_join_groub', 'group_join_request')
	`, state, groupID, senderID)
	return err
}
