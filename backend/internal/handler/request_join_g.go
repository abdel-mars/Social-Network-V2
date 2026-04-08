package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	notificationgoroutine "social-network-backend/internal/notificationGoroutine"
	repo "social-network-backend/internal/repository"
)

type JoinRequest struct {
	GroupID int `json:"group_id"`
}

func Request_Join(w http.ResponseWriter, r *http.Request) {
	// The User It's Try To Joing In This System !!
	// Only allow POST
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Username Not Found In Context", http.StatusUnauthorized)
		return
	}
	var req JoinRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	fmt.Println("User is trying to join group:", req.GroupID)
	fmt.Println("the user who try to join ", userID)
	// i will add current to the members
	Insert_member(userID, req.GroupID, w, "requested")
	// Here I Will Set Notification
	// OK I WILL GET THE OWNER OF THE THIS GROUBE BECS IT'S THE ONE WHO WILL  SEE THIS NOTIFICAION
	// I Will Need The ID OF THE OWNER OF THIS GROUBE BECS HE IS THE ONE WHO WILL GET THIS NOTIFICAION
	var creatorID int
	err = repo.DB.QueryRow(`SELECT creator_id FROM groups WHERE id = ?`, req.GroupID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	fmt.Println("User Is Trying To Join Group:", req.GroupID)
	fmt.Println("The User Who I Try To Join ", userID)
	fmt.Println("The Owner Of Groub Who Must Take This_Notification", creatorID)
	message := fmt.Sprintf("Ther user %d it send to u to joing to the groube !!", userID)
	// I Will Set This Data To Notificaion (...)
	// I Will Check If The User It's Already Have This Notificaion !!
	// CHECKER HER !!

	id, err := AddNotification_Group(creatorID, userID, "request_join_groub", message, req.GroupID)
	if err != nil {
		http.Error(w, "Internal_server_error", http.StatusInternalServerError)
	}
	// <<====>>
	Notif, err := GetNotificationByID(int(id))
	if err != nil {
		http.Error(w, "INTERNAL_SERVER_ERROR", http.StatusInternalServerError)
	}
	// That's the notification who will go to the owner of groube
	notificationgoroutine.SendNotification(*Notif)
	//w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Join request received!")
	// Her I Will Need To Get The Information About This Notificaion To Send It To The One Who Will Take Notificaion
	// <<==(.!.)==>>
	// The Current User_Id ...
	// The Id of Group Who It's Try To injoin to it
	// i will set to memnbership new row  at member_group
	// i will  register notification requesr_join_groupe
	// Send Notification To There admin of groupe
}

func AddNotification_Group(userID int, senderID int, notifType string, message string, groupID int) (int64, error) {
	// check if already exeists !!
	var existingID int64
	err := repo.DB.QueryRow(`
		SELECT id FROM notifications
		WHERE user_id = ? AND sender_id = ? AND type = ? AND group_id = ?
		LIMIT 1
	`, userID, senderID, notifType, groupID).Scan(&existingID)
	if err != nil && err != sql.ErrNoRows {
		return 0, fmt.Errorf("failed to check existing notification: %v", err)
	}
	if existingID != 0 {
		// Already exesist !!
		return existingID, nil
	}
	// Add New Notificaion <<===>>>
	result, err := repo.DB.Exec(`
		INSERT INTO notifications (user_id, sender_id, type, message, group_id)
		VALUES (?, ?, ?, ?, ?)`,
		userID, senderID, notifType, message, groupID,
	)
	if err != nil {
		return 0, fmt.Errorf("failed to insert notification: %v", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get last insert ID: %v", err)
	}
	return id, nil
}
