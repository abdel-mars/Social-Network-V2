package handler


import  (
	"fmt"
	"net/http"
	key "social-network-backend/internal/repository"
	"encoding/json"
	"database/sql"
)

func Reaction(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Reaction handler called!")
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		userID, ok := r.Context().Value(key.UserIDKey).(int)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		var input struct {
			PostID   int    `json:"post_id"`
			Reaction string `json:"reaction"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		var currentReaction string
		err := key.DB.QueryRow(
			"SELECT reaction_type FROM reactions WHERE user_id = ? AND post_id = ?",
			userID, input.PostID,
		).Scan(&currentReaction)
		// here if there is not row in the first the error will block the procces !!
		if err != nil {
			if err == sql.ErrNoRows {
				currentReaction = "" 
			} else {
				http.Error(w, "Database error", http.StatusInternalServerError)
				return
			}
		}
		if currentReaction == "" {
			// No Reaction Yet → insert new
			_, err = key.DB.Exec(
				"INSERT INTO reactions (user_id, post_id, reaction_type) VALUES (?, ?, ?)",
				userID, input.PostID, input.Reaction,
			)
		} else if currentReaction == input.Reaction {
			// <====>
			_, err = key.DB.Exec(
				"DELETE FROM reactions WHERE user_id = ? AND post_id = ?",
				userID, input.PostID,
			)
		} else {
			_, err = key.DB.Exec(
				"UPDATE reactions SET reaction_type = ? WHERE user_id = ? AND post_id = ?",
				input.Reaction, userID, input.PostID,
			)
		}
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	
		// |>....<| <<<<=====>>> !!!   
		var likes, dislikes int
		_ = key.DB.QueryRow(
			"SELECT COUNT(*) FROM reactions WHERE post_id = ? AND reaction_type = 'like'",
			input.PostID,
		).Scan(&likes)
		_ = key.DB.QueryRow(
			"SELECT COUNT(*) FROM reactions WHERE post_id = ? AND reaction_type = 'dislike'",
			input.PostID,
		).Scan(&dislikes)
		
		var userReaction sql.NullString
		_ = key.DB.QueryRow(
			"SELECT reaction_type FROM reactions WHERE user_id = ? AND post_id = ?",
			userID, input.PostID,
		).Scan(&userReaction)
	
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"likes_count":        likes,
			"dislikes_count":     dislikes,
			"userReaction": userReaction.String, 
		})
}
	

