package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	namix "social-network-backend/internal/repository"
	"strings"
)

func Notification(w http.ResponseWriter, r *http.Request) {
	fmt.Println("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
	fmt.Println("Hello world im her if you want <<--- ")
	fmt.Println("=================================")
	fmt.Println("=========================================")
	fmt.Println("-===============================")
	// Here it's about
	// Get  the query to get unread notificacion by the id of the reciver !!
	userId, ok := r.Context().Value(namix.UserIDKey).(int)
	if !ok {
		http.Error(w, "Server error", http.StatusInternalServerError)
	}
	// Ok So i will need all data of the user who is send this data
	// If It's Private
	Notification, err := GetUnreadNotifications(userId)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
	}
	fmt.Println("The Notification oooooooooh My gOod")
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
			EXISTS(
				SELECT 1
				FROM followers f
				WHERE f.follower_id = ? AND f.followed_id = n.sender_id AND f.status = 'accepted'
			) AS is_following_sender,
			g.id, g.title
		FROM notifications n
		JOIN users u ON n.sender_id = u.id
		LEFT JOIN groups g ON n.group_id = g.id
		WHERE n.user_id = ?
		  AND (
			n.state = 'unread'
			OR (
				n.type = 'Invitation_friendships'
				AND n.state = 'accepted'
				AND NOT EXISTS (
					SELECT 1
					FROM followers f2
					WHERE f2.follower_id = ? AND f2.followed_id = n.sender_id AND f2.status = 'accepted'
				)
			)
		  )
		ORDER BY n.created_at DESC
	`, userID, userID, userID)
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
			&n.IsFollowingSender,
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

type MarkNotificationsReadRequest struct {
	IDs []int `json:"ids"`
}

func MarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(namix.UserIDKey).(int)
	if !ok {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	var req MarkNotificationsReadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.IDs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "No notifications to update"})
		return
	}

	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(req.IDs)), ",")
	args := make([]interface{}, 0, len(req.IDs)+1)
	args = append(args, userID)
	for _, id := range req.IDs {
		args = append(args, id)
	}

	query := fmt.Sprintf(`
		UPDATE notifications
		SET state = 'read'
		WHERE user_id = ? AND state != 'read' AND id IN (%s)
	`, placeholders)

	if _, err := namix.DB.Exec(query, args...); err != nil {
		http.Error(w, "Failed to update notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Notifications marked as read"})
}

func ClearNotifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(namix.UserIDKey).(int)
	if !ok {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Update all unread or pending interactive notifications that haven't been responded to
	query := `
		UPDATE notifications
		SET state = 'read'
		WHERE user_id = ? AND state != 'read'
	`

	if _, err := namix.DB.Exec(query, userID); err != nil {
		http.Error(w, "Failed to clear notifications", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "All notifications cleared"})
}


