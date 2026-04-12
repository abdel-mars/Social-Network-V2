package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	re "social-network-backend/internal/repository"
	"strconv"
	"strings"
)

// THIS SUBMIT IT'S STILL NEED IMPROVING I JUST WANT TO SAVE COMMENT HER TO HANDLE THEM IN BACK-END !!!

func Submitcomment(w http.ResponseWriter, r *http.Request) {

	fmt.Println("Hello im her if you want to get them !!") 

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
        // --- Add new comment ---
        userID, ok := r.Context().Value(re.UserIDKey).(int)
        if !ok {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        var input struct {
            Content string `json:"content"`
        }
        if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
            http.Error(w, "Invalid JSON", http.StatusBadRequest)
            return
        }
        var comment map[string]interface{}

        if postType == "group_post" {
            if !canAccessGroupPost(postID, userID) {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
            }

            res, err := re.DB.Exec(
                `INSERT INTO group_post_comments (user_id, group_post_id, content) VALUES (?, ?, ?)`,
                userID, postID, input.Content,
            )
            if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }

            id, _ := res.LastInsertId()

            var commentID, uid, pid int
            var commentText, createdAt, username string
            err = re.DB.QueryRow(`
                SELECT c.id, c.user_id, c.group_post_id, c.content, c.created_at, u.username
                FROM group_post_comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.id = ?
            `, id).Scan(&commentID, &uid, &pid, &commentText, &createdAt, &username)
            if err != nil {
                if err == sql.ErrNoRows {
                    http.Error(w, "Comment not found after insertion", http.StatusInternalServerError)
                    return
                }
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }

            comment = map[string]interface{}{
                "id":         commentID,
                "user_id":    uid,
                "user_name":  username,
                "post_id":    pid,
                "text":       commentText,
                "created_at": createdAt,
            }
        } else {
            stmt, err := re.DB.Prepare(re.INSERT_NEW_COMMENT)
            if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }

            res, err := stmt.Exec(userID, postID, input.Content)
            if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }

            id, _ := res.LastInsertId()

            var commentID, uid, pid int
            var commentText, createdAt, username string
            err = re.DB.QueryRow(`
                SELECT c.id, c.user_id, c.post_id, c.content, c.created_at, u.username
                FROM comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.id = ?
            `, id).Scan(&commentID, &uid, &pid, &commentText, &createdAt, &username)
            if err != nil {
                if err == sql.ErrNoRows{
                    http.Error(w, "Comment not found after insertion", http.StatusInternalServerError)
                    return
                }
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }

            comment = map[string]interface{}{
                "id":         commentID,
                "user_id":    uid,
                "user_name":  username,
                "post_id":    pid,
                "text":       commentText,
                "created_at": createdAt,
            }
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(comment)

    case http.MethodGet:
        var rows *sql.Rows
        if postType == "group_post" {
            viewerID, ok := r.Context().Value(re.UserIDKey).(int)
            if !ok || !canAccessGroupPost(postID, viewerID) {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
            }
            rows, err = re.DB.Query(
                `SELECT c.id, c.user_id, c.group_post_id, c.content, c.created_at, u.username
                 FROM group_post_comments c
                 JOIN users u ON u.id = c.user_id
                 WHERE c.group_post_id = ? ORDER BY c.created_at ASC`, postID,
            )
        } else {
            rows, err = re.DB.Query(
                `SELECT c.id, c.user_id, c.post_id, c.content, c.created_at, u.username
                 FROM comments c
                 JOIN users u ON u.id = c.user_id
                 WHERE c.post_id = ? ORDER BY c.created_at ASC`, postID,
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
            if err := rows.Scan(&id, &uid, &pid, &text, &createdAt, &username); err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }
            comments = append(comments, map[string]interface{}{
                "id":         id,
                "user_id":    uid,
                "user_name":  username,
                "post_id":    pid,
                "text":       text,
                "created_at": createdAt,
            })
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(comments)

    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}
