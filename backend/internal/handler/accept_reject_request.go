package handler


import (
	"fmt"
	"net/http"
	"encoding/json"
	 
	repo "social-network-backend/internal/repository"
)


// FOLLOW REQUESST BODY !!!!!!
type FollowAction struct {
	SenderID int    `json:"sender_id"`
	Status   string `json:"status"`
}

func Accept_or_reject(w http.ResponseWriter, r *http.Request){
		var req FollowAction
		// Here I Will GeT The Curent User !  
	 	userID, ok := r.Context().Value(repo.UserIDKey).(int)
		if ! ok {
			http.Error(w, "Internal_server_Error", http.StatusInternalServerError)
		} 
		// Decode the JSON body into the struct
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		// Now You Can Access The Two Values !!
		fmt.Println("Sender ID:", req.SenderID)
		fmt.Println("Status:", req.Status)
		// Example logic !
		if req.Status == "accept" {
			fmt.Println("User accepted the follow request")
			// here i will set now the row of req_user follow  ===> followed userID
			addaccepstatus(userID, req.SenderID, w)
		} else if req.Status == "reject" {
			fmt.Println("User rejected the follow request")
			// Here I Will Remove This Row On Db .. 
			// I will remove the 
			RemoveFollow(req.SenderID, userID)  
			RemoveNotification(userID, req.SenderID, "Invitation_friendships")
		} else {
			http.Error(w, "Invalid status value", http.StatusBadRequest)
			return
		}
		//os.Exit(0)
	    w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "It's done"})
	
}

func addaccepstatus(userId, SenderID int, w http.ResponseWriter) {
	// <<upadte ..... Insert into followers table >>
	_, err := repo.DB.Exec(`
		INSERT INTO followers (follower_id, followed_id, status)
		VALUES (?, ?, 'accepted')
		ON CONFLICT(follower_id, followed_id) DO UPDATE SET status='accepted'
	`, SenderID, userId)
	if err != nil {
		http.Error(w, "Failed to add follower", http.StatusInternalServerError)
		return
	}

	// << update notification state !! >> !!
	_, err = repo.DB.Exec(`
		UPDATE notifications
		SET state = 'accepted'
		WHERE sender_id = ? AND user_id = ? AND type = 'Invitation_friendships'
	`, SenderID, userId)
	if err != nil {
		http.Error(w, "Failed to update notification", http.StatusInternalServerError)
		return
	}
}