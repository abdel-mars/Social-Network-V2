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
	FollowersCount int    `json:"followers_Count"`
	FollowingCount int    `json:"following_Count"`
}

func Setfollowers(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Setfollowers called")
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
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	ispanding, err := idPnadinstate(userID, req.FollowedID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	isPrivate, err := IsUserPrivate(req.FollowedID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	var status string
	if isFollowing {
		// Unfollow
		RemoveFollow(userID, req.FollowedID)
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")
		notificationgoroutine.SendNotificationRemoval(req.FollowedID, userID, "Invitation_friendships")
		status = "none"
	} else if ispanding {
		// Cancel pending request
		RemoveFollow(userID, req.FollowedID)
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")
		notificationgoroutine.SendNotificationRemoval(req.FollowedID, userID, "Invitation_friendships")
		status = "none"
	} else {
		// Add new follow or request
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

		// Prevent duplicates
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")

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
	following_Count, _ := GetFollowingCount(userID)

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
	var receiverIsPrivate int // Scan as int to be safe

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
		&groupID,
		&groupTitle,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Assign nullable fields
	n.Sender.FirstName = firstName.String
	n.Sender.LastName = lastName.String
	n.Sender.Avatar = avatar.String
	n.ReceiverIsPrivate = receiverIsPrivate == 1
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

func RemoveNotification(userID, followedID int, notifType string) {
	_, err := repo.DB.Exec(`
        DELETE FROM notifications
        WHERE user_id = ? AND sender_id = ? AND type = ?
    `, followedID, userID, notifType)
	if err != nil {
		fmt.Println("Error removing notification:", err)
	}
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
	var isPrivate int
	err := repo.DB.QueryRow(`SELECT is_private FROM users WHERE id = ?`, userID).Scan(&isPrivate)
	if err != nil {
		return false, err
	}
	return isPrivate == 1, nil
}
