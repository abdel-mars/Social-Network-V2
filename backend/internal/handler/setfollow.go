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
	// Here I Will Get The ID Of Current User !!
	//  tracker
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	// !! <<==|-|==>> !!
	if !ok {
		http.Error(w, "Username Not Found In Context", http.StatusUnauthorized)
		return
	}
	var req FollowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	var status string
	// Here I Will Check The Curent Status at db if it's pending !
	ispanding, err := idPnadinstate(userID, req.FollowedID)
	fmt.Println("=========================================")
	if err != nil {
		fmt.Println("howa ")
	}
	if ispanding {
		fmt.Println("im at is panding")
		// here i will remove the padding
		RemoveFollow(userID, req.FollowedID)
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")
		status = "Howa"
		// !-! <<==(.)==>> !-!
		// Copy Of the Users In To In Another Data Set ....
		// <<=====>>
		// here i will set
	}
	// Check if follower is already following followed
	isFollowing, err := IsFollowing(userID, req.FollowedID)
	if err != nil {
		http.Error(w, "error checking follow status", http.StatusInternalServerError)
		return
	}
	// (===>>|..\'/..|<<===)
	if isFollowing {
		err = RemoveFollow(userID, req.FollowedID)
		// Her I Will remove the notification from db !
		RemoveNotification(userID, req.FollowedID, "Invitation_friendships")
	} else if !ispanding {
		// check if Target user is private
		isPrivate, err := IsUserPrivate(req.FollowedID)
		if err != nil {
			http.Error(w, "error checking privacy", http.StatusInternalServerError)
			return
		}
		status = "accepted"
		if isPrivate {
			status = "pending"
		}
		fmt.Println("Here At Back-End At Status Who Is Set On Table", status)
		err = AddFollow(userID, req.FollowedID, status)
		// Here when i will send Notification To user
		// Her I Will send message of the user it's follow u
		// Check State Of This Request From Status !
		// State ==> <=pending=> <===> <=accepte=>
		// << Here I Will store t HE NOTIFICATION IN DATA BASE FOR TRACK THE EVENT
		// Here I Will Register The <.> !
		message := fmt.Sprintf("The Request It's Done And It's At State %s", status)
		Notification_ID, err := AddNotification(userID, req.FollowedID, "Invitation_friendships", message)
		if err != nil {
			http.Error(w, "server erro", http.StatusInternalServerError)
		}
		// Her I Will Get The Data By Id
		Notif, err := GetNotificationByID(int(Notification_ID))
		if err != nil {
			fmt.Println("Error getting notification by ID:", err)
		}

		if Notif != nil {
			fmt.Println("<<<< Sending Real-time Notification >>>>")
			notificationgoroutine.SendNotification(*Notif)
		} else {
			fmt.Println("Warning: Notification not found for ID", Notification_ID)
		}
	}

	followers_Count, err := GetFollowersCount(req.FollowedID)
	if err != nil {
		http.Error(w, "Failed to get followers count", http.StatusInternalServerError)
		return
	}

	following_Count, err := GetFollowingCount(req.FollowedID)
	if err != nil {
		http.Error(w, "Failed to get following count", http.StatusInternalServerError)
		return
	}
	// <===>> return new status <====>
	// Her I Will Curent State Of This Users If It's ...!
	fmt.Println("her from back-end", status)
	res := FollowResponse{
		Following:      !isFollowing,
		Status:         status,
		FollowersCount: followers_Count,
		FollowingCount: following_Count,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // <<===>>...!
}

func GetNotificationByID(notificationID int) (*repo.Notification, error) {
	row := repo.DB.QueryRow(`
		SELECT 
			n.id, n.user_id, n.sender_id, n.type, n.message, n.state, n.created_at,
			s.id, s.username, s.first_name, s.last_name, s.avatar,
			r.is_private,
			n.group_id,   -- <<< add this to get the group ID
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
		&n.Sender.FirstName,
		&n.Sender.LastName,
		&n.Sender.Avatar,
		&n.ReceiverIsPrivate,
		&groupID, // Use NullInt64 for potentially null field
		&groupTitle,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if groupTitle.Valid {
		n.GroupTitle = groupTitle.String
	} else {
		n.GroupTitle = ""
	}

	if groupID.Valid {
		n.GroupID = int(groupID.Int64)
	} else {
		n.GroupID = 0
	}

	return &n, nil
}

// ////// <<<=====>>>
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

// Remove a notification
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
	var isPrivate bool
	err := repo.DB.QueryRow(`SELECT is_private FROM users WHERE id = ?`, userID).Scan(&isPrivate)
	if err != nil {
		return false, err
	}
	return isPrivate, nil
}
