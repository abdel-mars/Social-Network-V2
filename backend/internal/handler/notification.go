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
	userId, ok := r.Context().Value(namix.UserIDKey).(int)
	if !ok {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	Notification, err := GetUnreadNotifications(userId)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Notification)
}

func GetUnreadNotifications(userID int) ([]namix.Notification, error) {
	rows, err := namix.DB.Query(`
		SELECT 
			n.id, n.user_id, n.type, n.message, n.state, n.created_at,
			u.id, u.username, u.first_name, u.last_name, u.avatar,
			r.is_private,
			EXISTS(
				SELECT 1
				FROM followers f
				WHERE f.follower_id = ? AND f.followed_id = n.sender_id AND f.status = 'accepted'
			) AS is_following_sender,
			EXISTS(
				SELECT 1
				FROM followers f
				WHERE f.follower_id = ? AND f.followed_id = n.sender_id AND f.status = 'pending'
			) AS is_pending_sender,
			g.id, g.title
		FROM notifications n
		JOIN users u ON n.sender_id = u.id
		JOIN users r ON n.user_id = r.id
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
	`, userID, userID, userID, userID)
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
			&n.UserID,
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
			&n.IsPendingSender,
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

	query := `
		UPDATE notifications
		SET state = 'read'
		WHERE user_id = ? 
		  AND state != 'read'
		  AND NOT (
		    type = 'Invitation_friendships' 
		    AND (
		        (state = 'unread' AND EXISTS (SELECT 1 FROM users WHERE id = notifications.user_id AND is_private = 1))
		        OR 
		        (state = 'accepted' AND NOT EXISTS (
		            SELECT 1 FROM followers f 
		            WHERE f.follower_id = notifications.user_id 
		              AND f.followed_id = notifications.sender_id 
		              AND f.status = 'accepted'
		        ))
		    )
		  )
	`

	if _, err := namix.DB.Exec(query, userID); err != nil {
		http.Error(w, "Failed to clear notifications", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "All notifications cleared"})
}
