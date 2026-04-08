package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	get "social-network-backend/internal/repository"
    "database/sql"
    key "social-network-backend/internal/repository"
)

func Getposts(w http.ResponseWriter, r *http.Request) {

    fmt.Println("I Call The Get Posts...")
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    userID, ok := r.Context().Value(key.UserIDKey).(int)
    if !ok {
        http.Error(w, "Username Not Found In Context", http.StatusUnauthorized)
        return
    }

    posts, err := getAllPosts(userID)
    fmt.Print("THIS IS MY POSTS DATAAAA ",posts)
 
    if err != nil {
        fmt.Println("There is a problem in get posts:", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(posts); err != nil {
        fmt.Println("Error encoding posts:", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }
}

func getAllPosts(userID int) ([]get.Posts, error) {
    query := `
        SELECT p.id, p.user_id, u.username, u.first_name || ' ' || u.last_name AS full_name,u.avatar,
               p.title, p.content, p.image_path, p.created_at, p.updated_at,
               (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type='like') AS likes_count,
               (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type='dislike') AS dislikes_count,
               (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS user_reaction
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
    `
    rows, err := get.DB.Query(query, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var posts []get.Posts
    for rows.Next() {
        var p get.Posts
        var userReaction sql.NullString

        if err := rows.Scan(
            &p.ID, &p.UserID, &p.UserName, &p.FullName, &p.Avatar,
            &p.Title, &p.Content, &p.ImagePath, &p.CreatedAt, &p.UpdatedAt,
            &p.LikesCount, &p.DislikesCount, &userReaction,
        ); err != nil {
            return nil, err
        }
        if userReaction.Valid {
            p.UserReaction = &userReaction.String
        } else {
            p.UserReaction = nil
        }

        posts = append(posts, p)
    }
    return posts, nil
}

