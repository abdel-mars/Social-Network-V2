package handler

import (
	"fmt"
	"net/http"
	key "social-network-backend/internal/repository"
	get "social-network-backend/internal/set_get_data_base"
	"encoding/json"
	"strconv"
	
)

func Profile(w http.ResponseWriter, r *http.Request) {
	// here i will get the context of the user id 
	userid, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		 // 
	}
	fmt.Println("The profile it's called ohhh !")
	url := r.URL
	userIDStr := r.URL.Query().Get("id")
	fmt.Println("The user id who is come from the front ",userIDStr)
	fmt.Println("the url who is come ===", url)
    if userIDStr == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"message": "Missing user ID"})
        return
    }
	fmt.Println(userIDStr)
    userID, err := strconv.Atoi(userIDStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"message": "Invalid user ID"})
        return
    }
    Data, err := get.GetUserInfo(userID)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"message": "Internal server error"})
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
	// here i will check the state of  
	Isp ,_ := checkstate(userid, userID) 

	folowthem , err  := IsFollowing(userid, userID)
	// Here I Will <===>  
	response := struct {
		User           key.User `json:"user"`
		FollowersCount int       `json:"followers_count"`
		FollowingCount int       `json:"following_count"`
		IsFriend       bool `json:"isfriend"`
		Ispadding bool `json:"p"`
	}{
		User:           Data,
		FollowersCount: followersCount,
		FollowingCount: followingCount,
		IsFriend: folowthem,
		Ispadding: Isp,
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

