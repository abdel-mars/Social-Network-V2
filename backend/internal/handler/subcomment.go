package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	re "social-network-backend/internal/repository"
	jib "social-network-backend/internal/set_get_data_base"
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

        // Return the inserted comment with timestamp
        var commentID, uid, pid int
        var commentText, createdAt string
        err = re.DB.QueryRow(
            `SELECT id, user_id, post_id, content, created_at FROM comments WHERE id = ?`, id,
        ).Scan(&commentID, &uid, &pid, &commentText, &createdAt)
        if err != nil {
            if err == sql.ErrNoRows{
                http.Error(w, "Comment not found after insertion", http.StatusInternalServerError)
                return
                
            }
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        comment := map[string]interface{}{
            "id":         commentID,
            "user_id":    uid,
            "post_id":    pid,
            "text":       commentText,
            "created_at": createdAt,
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(comment)

    case http.MethodGet:
        // >> Her i Will get the comment of the post!
        rows, err := re.DB.Query(
            `SELECT id, user_id, post_id, content, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC`, postID,
        )
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        defer rows.Close()

        var comments []map[string]interface{}
        for rows.Next() {
            var id, uid, pid int
            var text, createdAt string
            if err := rows.Scan(&id, &uid, &pid, &text, &createdAt); err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }
            // Her I Will Get Name Of The User By User Id 
            name , _ := jib.GetUserNameById(uid)
            comments = append(comments, map[string]interface{}{
                "id":         id,
                "user_id":    name,
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
