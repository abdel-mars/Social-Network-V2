package handler

import (
	"fmt"
	"net/http"
	get "social-network-backend/internal/repository"
	"database/sql"
	"encoding/json"
    "strconv"
)


func PostsUserProfile(w http.ResponseWriter, r *http.Request) {
    fmt.Println("Fetching posts for a user...")

    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    // <<===>>
    userIDStr := r.URL.Query().Get("id")
    if userIDStr == "" {
        http.Error(w, "Missing user ID", http.StatusBadRequest)
        return
    }
    // 
    userID, err := strconv.Atoi(userIDStr)
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    posts, err := getUserPosts(userID)
    if err != nil {
        fmt.Println("Error getting posts:", err)
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

func getUserPosts(userID int) ([]get.Posts, error) {
    query := `
        SELECT p.id, p.user_id, u.username, u.first_name || ' ' || u.last_name AS full_name, u.avatar,
               p.title, p.content, p.image_path, p.created_at, p.updated_at,
               (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type='like') AS likes_count,
               (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type='dislike') AS dislikes_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
               (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS user_reaction
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?        -- <-- Filter only posts by this user
        ORDER BY p.created_at DESC
    `

    rows, err := get.DB.Query(query, userID, userID)
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
            &p.LikesCount, &p.DislikesCount, &p.CommentsCount, &userReaction,
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
