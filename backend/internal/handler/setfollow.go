package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	notificationgoroutine "social-network-backend/internal/notificationGoroutine"
	repo "social-network-backend/internal/repository"
)

type FollowRequest struct {
	FollowedID int `json:"followed_id"`
}

type FollowResponse struct {
	Following      bool   `json:"following"`
	Status         string `json:"status"`
	FollowersCount int    `json:"followers_count"`
	FollowingCount int    `json:"following_count"`
}

func Setfollowers(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req FollowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if userID == req.FollowedID {
		http.Error(w, "You cannot follow yourself", http.StatusBadRequest)
		return
	}

	isFollowing, err := IsFollowing(userID, req.FollowedID)
	if err != nil {
		fmt.Println("[Follow] IsFollowing error:", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	ispanding, err := idPnadinstate(userID, req.FollowedID)
	if err != nil {
		fmt.Println("[Follow] idPnadinstate error:", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	isPrivate, err := IsUserPrivate(req.FollowedID)
	if err != nil {
		fmt.Println("[Follow] IsUserPrivate error:", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	fmt.Printf("[Follow] User %d -> %d. Following: %v, Pending: %v, Private: %v\n", userID, req.FollowedID, isFollowing, ispanding, isPrivate)

	var status string
	if isFollowing {
		RemoveFollow(userID, req.FollowedID)
		// Receiver: A, Sender: B
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")
		RemoveNotification(userID, req.FollowedID, "follow_accepted")
		notificationgoroutine.SendNotificationRemoval(req.FollowedID, userID, "Invitation_friendships")
		notificationgoroutine.SendNotificationRemoval(req.FollowedID, userID, "follow_accepted")
		status = "none"
	} else if ispanding {
		RemoveFollow(userID, req.FollowedID)
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")
		RemoveNotification(userID, req.FollowedID, "follow_accepted")
		notificationgoroutine.SendNotificationRemoval(req.FollowedID, userID, "Invitation_friendships")
		notificationgoroutine.SendNotificationRemoval(req.FollowedID, userID, "follow_accepted")
		status = "none"
	} else {
		if isPrivate {
			status = "pending"
		} else {
			status = "accepted"
		}

		err = AddFollow(userID, req.FollowedID, status)
		if err != nil {
			http.Error(w, "error adding follow", http.StatusInternalServerError)
			return
		}

		// Cleanup logic: If we follow someone, remove any stale invitation we might have sent them previously
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")

		// NEW: Also remove any notification we received FROM them, BUT ONLY if they are already following us
		// (This handles clearing the "Follow Back" notification once we actually follow back, 
		// while preserving "Accept/Reject" buttons if their request is still pending)
		isOtherFollowingUs, _ := IsFollowing(req.FollowedID, userID)
		if isOtherFollowingUs {
			RemoveNotification(req.FollowedID, userID, "Invitation_friendships")
			notificationgoroutine.SendNotificationRemoval(userID, req.FollowedID, "Invitation_friendships")
		}

		var message string
		if isPrivate {
			message = "wants to follow you"
		} else {
			message = "started following you"
		}

		Notification_ID, err := AddNotification(userID, req.FollowedID, "Invitation_friendships", message)
		if err != nil {
			fmt.Println("Error adding notification:", err)
		} else {
			Notif, err := GetNotificationByID(int(Notification_ID))
			if err != nil {
				fmt.Println("Error getting notification by ID:", err)
			} else if Notif != nil {
				notificationgoroutine.SendNotification(*Notif)
			}
		}
	}

	followers_Count, _ := GetFollowersCount(req.FollowedID)
	following_Count, _ := GetFollowingCount(req.FollowedID)

	res := FollowResponse{
		Following:      status == "accepted",
		Status:         status,
		FollowersCount: followers_Count,
		FollowingCount: following_Count,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func GetNotificationByID(notificationID int) (*repo.Notification, error) {
	row := repo.DB.QueryRow(`
		SELECT 
			n.id, n.user_id, n.sender_id, n.type, n.message, n.state, n.created_at,
			s.id, s.username, s.first_name, s.last_name, s.avatar,
			r.is_private,
			EXISTS(
				SELECT 1
				FROM followers f
				WHERE f.follower_id = n.user_id AND f.followed_id = n.sender_id AND f.status = 'accepted'
			) AS is_following_sender,
			EXISTS(
				SELECT 1
				FROM followers f
				WHERE f.follower_id = n.user_id AND f.followed_id = n.sender_id AND f.status = 'pending'
			) AS is_pending_sender,
			n.group_id,
			g.title
		FROM notifications n
		JOIN users s ON n.sender_id = s.id
		JOIN users r ON n.user_id = r.id
		LEFT JOIN groups g ON n.group_id = g.id
		WHERE n.id = ?
	`, notificationID)

	var n repo.Notification
	var groupTitle sql.NullString
	var groupID sql.NullInt64
	var avatar sql.NullString
	var firstName sql.NullString
	var lastName sql.NullString
	var receiverIsPrivate bool

	err := row.Scan(
		&n.ID,
		&n.UserID,
		&n.SenderID,
		&n.Type,
		&n.Message,
		&n.State,
		&n.CreatedAt,
		&n.Sender.ID,
		&n.Sender.Username,
		&firstName,
		&lastName,
		&avatar,
		&receiverIsPrivate,
		&n.IsFollowingSender,
		&n.IsPendingSender,
		&groupID,
		&groupTitle,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	n.Sender.FirstName = firstName.String
	n.Sender.LastName = lastName.String
	n.Sender.Avatar = avatar.String
	n.ReceiverIsPrivate = receiverIsPrivate
	n.GroupTitle = groupTitle.String
	n.GroupID = int(groupID.Int64)

	return &n, nil
}

func AddNotification(userID, followedID int, notifType, message string) (int64, error) {
	result, err := repo.DB.Exec(`
        INSERT INTO notifications (user_id, sender_id, type, message)
        VALUES (?, ?, ?, ?)
    `, followedID, userID, notifType, message)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return id, nil
}

// RemoveNotification deletes a notification from the database.
// senderID: the ID of the user who sent the notification.
// receiverID: the ID of the user who received the notification.
func RemoveNotification(senderID, receiverID int, notifType string) {
	_, err := repo.DB.Exec(`
        DELETE FROM notifications
        WHERE user_id = ? AND sender_id = ? AND type = ?
    `, receiverID, senderID, notifType)
	if err != nil {
		fmt.Println("Error removing notification:", err)
	}
}

// UpdateNotificationState updates the state of a notification.
func UpdateNotificationState(senderID, receiverID int, notifType, newState string) {
	_, err := repo.DB.Exec(`
		UPDATE notifications
		SET state = ?
		WHERE user_id = ? AND sender_id = ? AND type = ?
	`, newState, receiverID, senderID, notifType)
	if err != nil {
		fmt.Println("Error updating notification state:", err)
	}
}

// GetNotificationBySenderReceiverType fetches a specific notification to send via SSE.
func GetNotificationBySenderReceiverType(senderID, receiverID int, notifType string) (*repo.Notification, error) {
	var id int
	err := repo.DB.QueryRow(`
		SELECT id FROM notifications 
		WHERE user_id = ? AND sender_id = ? AND type = ?
		ORDER BY created_at DESC LIMIT 1
	`, receiverID, senderID, notifType).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return GetNotificationByID(id)
}

func IsFollowing(followerID, followedID int) (bool, error) {
	var count int
	err := repo.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM followers 
		WHERE follower_id = ? AND followed_id = ? AND status = 'accepted'`,
		followerID, followedID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func idPnadinstate(userCurrent, userb int) (bool, error) {
	var count int
	err := repo.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM followers 
		WHERE follower_id = ? AND followed_id = ? AND status = 'pending'`,
		userCurrent, userb).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func AddFollow(followerID, followedID int, status string) error {
	_, err := repo.DB.Exec(`
        INSERT INTO followers (follower_id, followed_id, status)
        VALUES (?, ?, ?)
    `, followerID, followedID, status)
	return err
}

func RemoveFollow(followerID, followedID int) error {
	_, err := repo.DB.Exec(`DELETE FROM followers WHERE follower_id = ? AND followed_id = ?`, followerID, followedID)
	return err
}

func IsUserPrivate(userID int) (bool, error) {
	var isPrivate bool
	err := repo.DB.QueryRow(`SELECT is_private FROM users WHERE id = ?`, userID).Scan(&isPrivate)
	if err != nil {
		return false, err
	}
	return isPrivate, nil
}
