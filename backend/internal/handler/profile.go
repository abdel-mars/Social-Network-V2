package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	key "social-network-backend/internal/repository"
	get "social-network-backend/internal/set_get_data_base"
)

func Profile(w http.ResponseWriter, r *http.Request) {
	// Current logged in user ID from context
	userid, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		// handle appropriately
	}

	userIDStr := r.URL.Query().Get("id")
    if userIDStr == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"message": "Missing user ID"})
        return
    }
	
    userID, err := strconv.Atoi(userIDStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"message": "Invalid user ID"})
        return
    }

    Data, err := get.GetUserInfo(userID)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        if errors.Is(err, sql.ErrNoRows) {
            w.WriteHeader(http.StatusNotFound)
            json.NewEncoder(w).Encode(map[string]string{"message": "User not found"})
        } else {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"message": "Internal server error"})
        }
        return
    }

	followersCount, err := GetFollowersCount(userID)
	if err != nil {
		http.Error(w, "Failed to get followers count", http.StatusInternalServerError)
		return
	}
	followingCount, err := GetFollowingCount(userID)
	if err != nil {
		http.Error(w, "Failed to get following count", http.StatusInternalServerError)
		return
	}

	// Check if current user is following the profile user
	isFollowing, _ := IsFollowing(userid, userID)
	
	// Check if current user has a pending request to follow the profile user
	isPending, _ := checkstate(userid, userID) 

	// NEW: Check if the profile user is following the current user
	isFollower, _ := IsFollowing(userID, userid)

	response := struct {
		User           key.User `json:"user"`
		FollowersCount int       `json:"followers_count"`
		FollowingCount int       `json:"following_count"`
		IsFriend       bool      `json:"isfriend"`
		IsPending      bool      `json:"p"`
		IsFollower     bool      `json:"is_follower"`
	}{
		User:           Data,
		FollowersCount: followersCount,
		FollowingCount: followingCount,
		IsFriend:       isFollowing,
		IsPending:      isPending,
		IsFollower:     isFollower,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func checkstate(a, b int) (bool, error) {
	var count int
	err := key.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM followers 
		WHERE follower_id = ? AND followed_id = ? AND status = 'pending'`,
		a, b).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func GetFollowersCount(userID int) (int, error) {
	var count int
	err := key.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM followers 
		WHERE followed_id = ? AND status = 'accepted'
	`, userID).Scan(&count)
	return count, err
}

func GetFollowingCount(userID int) (int, error) {
	var count int
	err := key.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM followers 
		WHERE follower_id = ? AND status = 'accepted'
	`, userID).Scan(&count)
	return count, err
}
