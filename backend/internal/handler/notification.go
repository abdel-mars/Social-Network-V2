package handler

import (
	"fmt"
	"net/http"
	namix "social-network-backend/internal/repository"
	"encoding/json"
	"database/sql"
)

func Notification(w http.ResponseWriter, r *http.Request){
	fmt.Println("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
	fmt.Println("Hello world im her if you want <<--- ")
	fmt.Println("=================================")
	fmt.Println("=========================================")
	fmt.Println("-===============================")
	// Here it's about  
	// Get  the query to get unread notificacion by the id of the reciver !!
	userId , ok := r.Context().Value(namix.UserIDKey).(int)
	if !ok{
		http.Error(w, "Server error", http.StatusInternalServerError)
	}
	// Ok So i will need all data of the user who is send this data 
	// If It's Private 
	Notification , err:= GetUnreadNotifications(userId)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
	}
	fmt.Println("The Notification oooooooooh My gOod \n")
	fmt.Printf("The Current User %v\n", Notification)
	// let's talk about that ! 
	// I will Send To Back-End The Data Of This Current !
	// here i will get data of the one who is send data ! 
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Notification)
}

func GetUnreadNotifications(userID int) ([]namix.Notification, error) {
	rows, err := namix.DB.Query(`
		SELECT 
			n.id, n.type, n.message, n.state, n.created_at,
			u.id, u.username, u.first_name, u.last_name, u.avatar, u.is_private,
			g.id, g.title
		FROM notifications n
		JOIN users u ON n.sender_id = u.id
		LEFT JOIN groups g ON n.group_id = g.id
		WHERE n.user_id = ? AND n.state = 'unread'
		ORDER BY n.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []namix.Notification
	for rows.Next() {
		var n namix.Notification
		var groupID sql.NullInt64
		var groupTitle sql.NullString

		if err := rows.Scan(
			&n.ID,
			&n.Type,
			&n.Message,
			&n.State,
			&n.CreatedAt,
			&n.Sender.ID,
			&n.Sender.Username,
			&n.Sender.FirstName,
			&n.Sender.LastName,
			&n.Sender.Avatar,
			&n.ReceiverIsPrivate,
			&groupID,
			&groupTitle,
		); err != nil {
			return nil, err
		}

		if groupID.Valid {
			n.GroupID = int(groupID.Int64)
		} else {
			n.GroupID = 0
		}

		if groupTitle.Valid {
			n.GroupTitle = groupTitle.String
		} else {
			n.GroupTitle = ""
		}

		notifications = append(notifications, n)
	}

	return notifications, nil
}
