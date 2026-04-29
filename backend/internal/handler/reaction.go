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
			PostType string `json:"post_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if input.PostType == "" {
			input.PostType = "post"
		}
		if input.Reaction != "like" && input.Reaction != "dislike" {
			http.Error(w, "Invalid reaction", http.StatusBadRequest)
			return
		}

		var selectQuery, insertQuery, deleteQuery, updateQuery string
		var likesQuery, dislikesQuery string

		if input.PostType == "group_post" {
			if !canAccessGroupPost(input.PostID, userID) {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			selectQuery = "SELECT reaction_type FROM group_post_reactions WHERE user_id = ? AND group_post_id = ?"
			insertQuery = "INSERT INTO group_post_reactions (user_id, group_post_id, reaction_type) VALUES (?, ?, ?)"
			deleteQuery = "DELETE FROM group_post_reactions WHERE user_id = ? AND group_post_id = ?"
			updateQuery = "UPDATE group_post_reactions SET reaction_type = ? WHERE user_id = ? AND group_post_id = ?"
			likesQuery = "SELECT COUNT(*) FROM group_post_reactions WHERE group_post_id = ? AND reaction_type = 'like'"
			dislikesQuery = "SELECT COUNT(*) FROM group_post_reactions WHERE group_post_id = ? AND reaction_type = 'dislike'"
		} else if input.PostType == "comment" {
			selectQuery = "SELECT CASE WHEN is_like=1 THEN 'like' WHEN is_dislike=1 THEN 'dislike' ELSE '' END FROM comment_likes_dislikes WHERE user_id = ? AND comment_id = ?"
			insertQuery = "INSERT INTO comment_likes_dislikes (user_id, comment_id, is_like, is_dislike) VALUES (?, ?, CASE WHEN ?='like' THEN 1 ELSE 0 END, CASE WHEN ?='dislike' THEN 1 ELSE 0 END)"
			deleteQuery = "DELETE FROM comment_likes_dislikes WHERE user_id = ? AND comment_id = ?"
			updateQuery = "UPDATE comment_likes_dislikes SET is_like = CASE WHEN ?='like' THEN 1 ELSE 0 END, is_dislike = CASE WHEN ?='dislike' THEN 1 ELSE 0 END WHERE user_id = ? AND comment_id = ?"
			likesQuery = "SELECT COUNT(*) FROM comment_likes_dislikes WHERE comment_id = ? AND is_like = 1"
			dislikesQuery = "SELECT COUNT(*) FROM comment_likes_dislikes WHERE comment_id = ? AND is_dislike = 1"
		} else if input.PostType == "group_post_comment" {
			selectQuery = "SELECT reaction_type FROM group_post_comment_reactions WHERE user_id = ? AND group_post_comment_id = ?"
			insertQuery = "INSERT INTO group_post_comment_reactions (user_id, group_post_comment_id, reaction_type) VALUES (?, ?, ?)"
			deleteQuery = "DELETE FROM group_post_comment_reactions WHERE user_id = ? AND group_post_comment_id = ?"
			updateQuery = "UPDATE group_post_comment_reactions SET reaction_type = ? WHERE user_id = ? AND group_post_comment_id = ?"
			likesQuery = "SELECT COUNT(*) FROM group_post_comment_reactions WHERE group_post_comment_id = ? AND reaction_type = 'like'"
			dislikesQuery = "SELECT COUNT(*) FROM group_post_comment_reactions WHERE group_post_comment_id = ? AND reaction_type = 'dislike'"
		} else {
			selectQuery = "SELECT reaction_type FROM reactions WHERE user_id = ? AND post_id = ?"
			insertQuery = "INSERT INTO reactions (user_id, post_id, reaction_type) VALUES (?, ?, ?)"
			deleteQuery = "DELETE FROM reactions WHERE user_id = ? AND post_id = ?"
			updateQuery = "UPDATE reactions SET reaction_type = ? WHERE user_id = ? AND post_id = ?"
			likesQuery = "SELECT COUNT(*) FROM reactions WHERE post_id = ? AND reaction_type = 'like'"
			dislikesQuery = "SELECT COUNT(*) FROM reactions WHERE post_id = ? AND reaction_type = 'dislike'"
		}
		selectArgs := []interface{}{userID, input.PostID}
		insertArgs := []interface{}{userID, input.PostID, input.Reaction}
		updateArgs := []interface{}{input.Reaction, userID, input.PostID}

		if input.PostType == "comment" {
			insertArgs = []interface{}{userID, input.PostID, input.Reaction, input.Reaction}
			updateArgs = []interface{}{input.Reaction, input.Reaction, userID, input.PostID}
		}

		var currentReaction string
		err := key.DB.QueryRow(
			selectQuery,
			selectArgs...,
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
			_, err = key.DB.Exec(insertQuery, insertArgs...)
		} else if currentReaction == input.Reaction {
			// <====>
			_, err = key.DB.Exec(
				deleteQuery,
				userID, input.PostID,
			)
		} else {
			_, err = key.DB.Exec(updateQuery, updateArgs...)
		}
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	
		// |>....<| <<<<=====>>> !!!   
		var likes, dislikes int
		_ = key.DB.QueryRow(
			likesQuery,
			input.PostID,
		).Scan(&likes)
		_ = key.DB.QueryRow(
			dislikesQuery,
			input.PostID,
		).Scan(&dislikes)
		
		var userReaction sql.NullString
		_ = key.DB.QueryRow(
			selectQuery,
			selectArgs...,
		).Scan(&userReaction)
	
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"likes_count":        likes,
			"dislikes_count":     dislikes,
			"userReaction": userReaction.String, 
		})
}

func canAccessGroupPost(groupPostID, userID int) bool {
	var exists int
	err := key.DB.QueryRow(`
		SELECT 1
		FROM group_posts gp
		JOIN group_members gm ON gm.group_id = gp.group_id
		WHERE gp.id = ? AND gm.user_id = ? AND gm.status = 'member'
		LIMIT 1
	`, groupPostID, userID).Scan(&exists)
	return err == nil && exists == 1
}
