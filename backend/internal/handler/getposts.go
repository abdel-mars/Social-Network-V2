package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	get "social-network-backend/internal/repository"
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
        SELECT *
        FROM (
            SELECT
                p.id,
                p.user_id,
                u.username,
                u.first_name || ' ' || u.last_name AS full_name,
                u.avatar,
                p.title,
                p.content,
                p.privacy,
                p.image_path,
                p.created_at,
                p.updated_at,
                (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type='like') AS likes_count,
                (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type='dislike') AS dislikes_count,
                (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS user_reaction,
                NULL AS group_id,
                NULL AS group_title
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.privacy = 'public'
               OR p.user_id = ?
               OR (p.privacy = 'almost_private' AND EXISTS (SELECT 1 FROM followers f WHERE f.followed_id = p.user_id AND f.follower_id = ? AND f.status = 'accepted'))
               OR (p.privacy = 'private' AND EXISTS (SELECT 1 FROM post_viewers pv WHERE pv.post_id = p.id AND pv.user_id = ?))

            UNION ALL

            SELECT
                gp.id,
                gp.creator_id AS user_id,
                u.username,
                u.first_name || ' ' || u.last_name AS full_name,
                u.avatar,
                gp.title,
                gp.content,
                'group' AS privacy,
                gp.image AS image_path,
                gp.created_at,
                gp.created_at AS updated_at,
                (SELECT COUNT(*) FROM group_post_reactions gr WHERE gr.group_post_id = gp.id AND gr.reaction_type='like') AS likes_count,
                (SELECT COUNT(*) FROM group_post_reactions gr WHERE gr.group_post_id = gp.id AND gr.reaction_type='dislike') AS dislikes_count,
                (SELECT reaction_type FROM group_post_reactions gr WHERE gr.group_post_id = gp.id AND gr.user_id = ?) AS user_reaction,
                gp.group_id,
                g.title AS group_title
            FROM group_posts gp
            JOIN users u ON gp.creator_id = u.id
            JOIN groups g ON gp.group_id = g.id
            JOIN group_members gm ON gm.group_id = gp.group_id
            WHERE gm.user_id = ? AND gm.status = 'member'
        ) combined_posts
        ORDER BY created_at DESC
    `
    // query params:
    // 1: userID (for user_reaction)
    // 2: userID (for p.user_id = ?)
    // 3: userID (for f.follower_id = ?)
    // 4: userID (for pv.user_id = ?)
    // 5: userID (for group user_reaction)
    // 6: userID (for gm.user_id = ?)

    rows, err := get.DB.Query(query, userID, userID, userID, userID, userID, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    posts := []get.Posts{}
    for rows.Next() {
        var p get.Posts
        var userReaction sql.NullString
        var groupID sql.NullInt64
        var groupTitle sql.NullString

        if err := rows.Scan(
            &p.ID, &p.UserID, &p.UserName, &p.FullName, &p.Avatar,
            &p.Title, &p.Content, &p.Privacy, &p.ImagePath, &p.CreatedAt, &p.UpdatedAt,
            &p.LikesCount, &p.DislikesCount, &userReaction, &groupID, &groupTitle,
        ); err != nil {
            return nil, err
        }
        if userReaction.Valid {
            p.UserReaction = &userReaction.String
        } else {
            p.UserReaction = nil
        }
        if groupID.Valid {
            p.GroupID = int(groupID.Int64)
        }
        if groupTitle.Valid {
            p.GroupTitle = groupTitle.String
        }

        posts = append(posts, p)
    }
    return posts, nil
}
