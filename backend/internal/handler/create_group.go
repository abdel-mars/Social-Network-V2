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
}

func Create_Group(w http.ResponseWriter, r *http.Request) {
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
	// data requesst fiha data 
	Id_group, err := Insert_group(req, userID, w)
	if err != nil {
		http.Error(w, "INTERNAL_SERVER_ERRRO", http.StatusInternalServerError)
	}
	// set the Admin as member 
	Insert_member(userID, int(Id_group), w, "member")
	// 
	fmt.Print("The goube it's created")
}

func Insert_group(Req Group_info, userID int, w http.ResponseWriter) (int64, error) {
	// <<<=='(+)'==>>>
	var err error
	howa, err := repo.DB.Exec(`insert INTO groups (title , description, creator_id) VALUES (?,?,?)`, Req.Title, Req.Description, userID)
	fmt.Println("----------------------------> i am here <----------------------")
	if err!= nil {
		http.Error(w, "INternal server errro", http.StatusInternalServerError)
	}
	id , err := howa.LastInsertId()
	return id , err
}

func Insert_member(UserID, GroupID int, w http.ResponseWriter, status string) {
	fmt.Printf("Inserting user %d into group %d with status %s\n", UserID, GroupID, status)

	res, err := repo.DB.Exec(`
		INSERT INTO group_members (group_id, user_id, status)
		VALUES (?, ?, ?)`, GroupID, UserID, status)

	if err != nil {
		fmt.Println("Error inserting member:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rows, _ := res.RowsAffected()
	fmt.Printf("Inserted %d rows successfully\n", rows)
}
