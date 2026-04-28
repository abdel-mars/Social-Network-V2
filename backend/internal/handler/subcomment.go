package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	re "social-network-backend/internal/repository"
	"social-network-backend/internal/sse"
	"strconv"
	"strings"
	"time"
)

func Submitcomment(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 || pathParts[0] != "posts" || pathParts[2] != "comments" {
		http.Error(w, "Invalid route", http.StatusNotFound)
		return
	}

	postID, err := strconv.Atoi(pathParts[1])
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	postType := r.URL.Query().Get("post_type")
	if postType == "" {
		postType = "post"
	}

	switch r.Method {
	case http.MethodPost:
		userID, ok := r.Context().Value(re.UserIDKey).(int)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			http.Error(w, "Error parsing form", http.StatusBadRequest)
			return
		}

		content := strings.TrimSpace(r.FormValue("content"))
		// Enforce 300 character limit
		runes := []rune(content)
		if len(runes) > 300 {
			content = string(runes[:300])
		}

		var imagePath string
		file, handler, err := r.FormFile("image")
		if err == nil {
			defer file.Close()
			os.MkdirAll("uploads", 0755)
			imagePath = fmt.Sprintf("uploads/comm_%d_%s", time.Now().Unix(), handler.Filename)
			f, err := os.Create(imagePath)
			if err != nil {
				http.Error(w, "Cannot save image", http.StatusInternalServerError)
				return
			}
			defer f.Close()
			io.Copy(f, file)
		}

		if content == "" && imagePath == "" {
			http.Error(w, "Content or image is required", http.StatusBadRequest)
			return
		}

		var comment map[string]interface{}

		if postType == "group_post" {
			if !canAccessGroupPost(postID, userID) {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			res, err := re.DB.Exec(
				`INSERT INTO group_post_comments (user_id, group_post_id, content, image_path) VALUES (?, ?, ?, ?)`,
				userID, postID, content, imagePath,
			)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			id, _ := res.LastInsertId()

			var commentID, uid, pid int
			var commentText, createdAt, username string
			var img sql.NullString
			err = re.DB.QueryRow(`
                SELECT c.id, c.user_id, c.group_post_id, c.content, c.created_at, u.username, c.image_path
                FROM group_post_comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.id = ?
            `, id).Scan(&commentID, &uid, &pid, &commentText, &createdAt, &username, &img)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			comment = map[string]interface{}{
				"id":           commentID,
				"user_id":      uid,
				"user_name":    username,
				"post_id":      pid,
				"text":         commentText,
				"created_at":   createdAt,
				"image_path":   img.String,
				"likes_count":  0,
				"userReaction": "",
			}
		} else {
			res, err := re.DB.Exec(re.INSERT_NEW_COMMENT, userID, postID, content, imagePath)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			id, _ := res.LastInsertId()

			var commentID, uid, pid int
			var commentText, createdAt, username string
			var img sql.NullString
			err = re.DB.QueryRow(`
                SELECT c.id, c.user_id, c.post_id, c.content, c.created_at, u.username, c.image_path
                FROM comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.id = ?
            `, id).Scan(&commentID, &uid, &pid, &commentText, &createdAt, &username, &img)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			comment = map[string]interface{}{
				"id":           commentID,
				"user_id":      uid,
				"user_name":    username,
				"post_id":      pid,
				"text":         commentText,
				"created_at":   createdAt,
				"image_path":   img.String,
				"likes_count":  0,
				"userReaction": "",
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comment)

		if postType == "group_post" {
			var groupID int
			err := re.DB.QueryRow(`SELECT group_id FROM group_posts WHERE id = ?`, postID).Scan(&groupID)
			if err == nil {
				sse.BroadcastToGroup(groupID, map[string]interface{}{
					"type": "new_group_comment",
					"data": comment,
				})
			}
		}

	case http.MethodGet:
		var rows *sql.Rows
		viewerID, ok := r.Context().Value(re.UserIDKey).(int)
		if !ok {
			viewerID = 0 // Or handle unauthorized if required
		}

		if postType == "group_post" {
			if viewerID > 0 && !canAccessGroupPost(postID, viewerID) {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			rows, err = re.DB.Query(
				`SELECT c.id, c.user_id, c.group_post_id, c.content, c.created_at, u.username, c.image_path,
				        (SELECT COUNT(*) FROM group_post_comment_reactions WHERE group_post_comment_id = c.id AND reaction_type = 'like') as likes_count,
						(SELECT reaction_type FROM group_post_comment_reactions WHERE group_post_comment_id = c.id AND user_id = ?) as user_reaction
                 FROM group_post_comments c
                 JOIN users u ON u.id = c.user_id
                 WHERE c.group_post_id = ? ORDER BY c.created_at ASC`, viewerID, postID,
			)
		} else {
			rows, err = re.DB.Query(
				`SELECT c.id, c.user_id, c.post_id, c.content, c.created_at, u.username, c.image_path,
				        (SELECT COUNT(*) FROM comment_likes_dislikes WHERE comment_id = c.id AND is_like = 1) as likes_count,
						(SELECT CASE WHEN is_like=1 THEN 'like' WHEN is_dislike=1 THEN 'dislike' ELSE '' END FROM comment_likes_dislikes WHERE comment_id = c.id AND user_id = ?) as user_reaction
                 FROM comments c
                 JOIN users u ON u.id = c.user_id
                 WHERE c.post_id = ? ORDER BY c.created_at ASC`, viewerID, postID,
			)
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var comments []map[string]interface{}
		for rows.Next() {
			var id, uid, pid int
			var text, createdAt, username string
			var img sql.NullString
			var likesCount int
			var userReaction sql.NullString
			if err := rows.Scan(&id, &uid, &pid, &text, &createdAt, &username, &img, &likesCount, &userReaction); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			comments = append(comments, map[string]interface{}{
				"id":           id,
				"user_id":      uid,
				"user_name":    username,
				"post_id":      pid,
				"text":         text,
				"created_at":   createdAt,
				"image_path":   img.String,
				"likes_count":  likesCount,
				"userReaction": userReaction.String,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comments)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
