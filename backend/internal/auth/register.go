package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"social-network-backend/internal/helpers"
	dt "social-network-backend/internal/set_get_data_base"
)

func Register(w http.ResponseWriter, r *http.Request) {
	
	if err := r.ParseMultipartForm(10 << 20); err != nil { // limit 10MB
		http.Error(w, `{"status":"error","message":"Cannot parse form"}`, http.StatusBadRequest)
		return
	}

	username := r.FormValue("username")
	firstName := r.FormValue("first_name")
	lastName := r.FormValue("last_name")
	email := r.FormValue("email")
	password := r.FormValue("password")
	confirmPassword := r.FormValue("confirmpassword")
	gender := r.FormValue("gender")
	nickname := r.FormValue("nickname")
	about := r.FormValue("about")
	age, _ := strconv.Atoi(r.FormValue("age"))

	// === Handle Avatar Upload ===
	file, handler, err := r.FormFile("avatar")
	var avatarPath string
	if err == nil {
		defer file.Close()

		uploadDir := "./uploads"
		os.MkdirAll(uploadDir, 0755)

		filename := fmt.Sprintf("%s_%s", username, filepath.Base(handler.Filename))
		avatarPath = filepath.Join(uploadDir, filename)

		dst, err := os.Create(avatarPath)
		if err != nil {
			http.Error(w, `{"status":"error","message":"Cannot save avatar"}`, http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		io.Copy(dst, file)
	} else {
		if strings.ToLower(gender) == "female" || strings.ToLower(gender) == "women" {
			avatarPath = "uploads/default-female-avatar.svg"
		} else {
			avatarPath = "uploads/default-male-avatar.svg"
		}
	}

	// === Validation !! ===
	if !helpers.ValidUsername(username) || !helpers.ValidUsername(firstName) || !helpers.ValidUsername(lastName) {
		http.Error(w, `{"status":"error","message":"Invalid username or name"}`, http.StatusBadRequest)
		return
	}
	if !helpers.ValidEmail(email) {
		http.Error(w, `{"status":"error","message":"Invalid email"}`, http.StatusBadRequest)
		return
	}
	if !helpers.ValidPassword(password) {
		http.Error(w, `{"status":"error","message":"Invalid password"}`, http.StatusBadRequest)
		return
	}
	if password != confirmPassword {
		http.Error(w, `{"status":"error","message":"Passwords do not match"}`, http.StatusBadRequest)
		return
	}

	// === Hash Password ===
	hash, err := helpers.HashPassword(password)
	if err != nil {
		http.Error(w, `{"status":"error","message":"Server error"}`, http.StatusInternalServerError)
		return
	}

	// <== set new user to database ==>
	err = dt.AddNewUser(username, email, hash, firstName, lastName, gender, age, nickname, about, avatarPath, "")
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, `{"status":"error","message":"Username or email already used"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"status":"error","message":"Server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "ok",
		"message": "Registration successful!",
	})
}
