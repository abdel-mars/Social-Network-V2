package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	repo "social-network-backend/internal/repository"
)

type Group_info struct {
	Title       string
	Description string
	Privacy     string `json:"privacy,omitempty"`
}

func Create_Group(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	fmt.Println("HHHHH you want to create Group")
	// <<------>>
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "INTERNAL_SERVER_ERRRO", http.StatusInternalServerError)
		return
	}
	// <<===>>
	var req Group_info
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.Privacy == "" {
		req.Privacy = "Public"
	}

	Id_group, err := Insert_group(req, userID)
	if err != nil {
		http.Error(w, "INTERNAL_SERVER_ERRRO", http.StatusInternalServerError)
		return
	}
	// set the Admin as member
	if err := Insert_member(userID, int(Id_group), "member"); err != nil {
		http.Error(w, "INTERNAL_SERVER_ERRRO", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"id":          Id_group,
		"title":       req.Title,
		"description": req.Description,
		"privacy":     req.Privacy,
		"user_status": "member",
	})
}

func Insert_group(Req Group_info, userID int) (int64, error) {
	howa, err := repo.DB.Exec(`INSERT INTO groups (title, description, privacy, creator_id) VALUES (?, ?, ?, ?)`, Req.Title, Req.Description, Req.Privacy, userID)
	if err != nil {
		return 0, err
	}
	return howa.LastInsertId()
}

func Insert_member(UserID, GroupID int, status string) error {
	fmt.Printf("Inserting user %d into group %d with status %s\n", UserID, GroupID, status)

	res, err := repo.DB.Exec(`
		UPDATE group_members SET status = ? WHERE group_id = ? AND user_id = ?`, status, GroupID, UserID)

	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows > 0 {
		return nil
	}

	_, err = repo.DB.Exec(`INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)`, GroupID, UserID, status)
	return err
}
