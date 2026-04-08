package handler

import (
	"encoding/json"
	"net/http"
	key "social-network-backend/internal/repository" 
)

func Get_Group_By_ID(w http.ResponseWriter, r *http.Request) {

    userID := r.Context().Value(key.UserIDKey).(int)
    groupID := r.URL.Query().Get("id")

    // << query of oooooooooooo
    row := key.DB.QueryRow(`
        SELECT 
            g.id, g.title, g.description, g.creator_id,
            u.username, u.first_name, u.last_name,
            EXISTS (
                SELECT 1 FROM group_members gm 
                WHERE gm.group_id = g.id AND gm.user_id = ? AND gm.status = 'member'
            ) AS is_member
        FROM groups g
        JOIN users u ON g.creator_id = u.id
        WHERE g.id = ?;
    `, userID, groupID)

    var group struct {
        ID          int    `json:"id"`
        Title       string `json:"title"`
        Description string `json:"description"`
        CreatorID   int    `json:"creator_id"`
        Admin       struct {
            Username  string `json:"username"`
            FirstName string `json:"first_name"`
            LastName  string `json:"last_name"`
        } `json:"admin"`
        IsMember bool `json:"is_member"`
    }
    
    err := row.Scan(&group.ID, &group.Title, &group.Description, &group.CreatorID,
        &group.Admin.Username, &group.Admin.FirstName, &group.Admin.LastName, &group.IsMember)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Memebers for testing
    membersRows, err :=  key.DB.Query(`
        SELECT u.id, u.username, u.first_name, u.last_name, gm.status
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?;
    `, groupID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer membersRows.Close()
    var members []map[string]interface{}
    for membersRows.Next() {
        var id int
        var username, firstName, lastName, status string
        _ = membersRows.Scan(&id, &username, &firstName, &lastName, &status)
        members = append(members, map[string]interface{}{
            "id":         id,
            "username":   username,
            "first_name": firstName,
            "last_name":  lastName,
            "status":     status,
        })
    }
    // Combine data
    response := map[string]interface{}{
        "group":   group,
        "members": members,
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
	// (.<<===(.)===>>.) 
}
