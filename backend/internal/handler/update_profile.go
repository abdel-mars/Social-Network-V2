package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	key "social-network-backend/internal/repository"
	"time"
)

func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form (10MB max)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	firstName := r.FormValue("first_name")
	lastName := r.FormValue("last_name")
	nickname := r.FormValue("nickname")
	about := r.FormValue("about")
	isPrivateStr := r.FormValue("is_private")

	isPrivate := 0
	if isPrivateStr == "true" || isPrivateStr == "1" {
		isPrivate = 1
	}

	// Fetch current user data to get old avatar and cover paths
	var oldAvatar string
	var oldCover sql.NullString
	err = key.DB.QueryRow("SELECT avatar, cover FROM users WHERE id = ?", userID).Scan(&oldAvatar, &oldCover)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var avatarPath = oldAvatar
	file, handler, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()

		// Generate new path
		newAvatarPath := fmt.Sprintf("uploads/avatar_%d_%s", time.Now().Unix(), handler.Filename)
		f, err := os.Create(newAvatarPath)
		if err != nil {
			http.Error(w, "Cannot save avatar", http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(f, file)

		// Delete old avatar if it exists and is different
		if oldAvatar != "" && oldAvatar != "default-avatar.png" {
			os.Remove(oldAvatar)
		}
		avatarPath = newAvatarPath
	}

	var coverPath = ""
	if oldCover.Valid {
		coverPath = oldCover.String
	}
	
	coverFile, coverHandler, err := r.FormFile("cover")
	if err == nil {
		defer coverFile.Close()

		// Generate new path
		newCoverPath := fmt.Sprintf("uploads/cover_%d_%s", time.Now().Unix(), coverHandler.Filename)
		f, err := os.Create(newCoverPath)
		if err != nil {
			http.Error(w, "Cannot save cover", http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(f, coverFile)

		// Delete old cover if it exists
		if coverPath != "" {
			os.Remove(coverPath)
		}
		coverPath = newCoverPath
	}

	// Update DB
	_, err = key.DB.Exec(`
		UPDATE users 
		SET first_name = ?, last_name = ?, nickname = ?, about = ?, is_private = ?, avatar = ?, cover = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, firstName, lastName, nickname, about, isPrivate, avatarPath, coverPath, userID)

	if err != nil {
		fmt.Println("Error updating profile:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Return success
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    "Profile updated successfully",
		"avatar":     avatarPath,
		"cover":      coverPath,
		"first_name": firstName,
		"last_name":  lastName,
		"nickname":   nickname,
		"about":      about,
		"is_private": isPrivate == 1,
	})
}
