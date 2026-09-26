package auth

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"social-network-backend/internal/helpers"
	format "social-network-backend/internal/helpers"
	dt "social-network-backend/internal/set_get_data_base"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Login(w http.ResponseWriter, r *http.Request) {
	// here i will set to header the port becs when request it's came from 3000
	// the writer he is not know where it will send response for that we are using this for spesific the port where the response will go !!
	// Here It's End To End <!<<==>>!> !!
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	fmt.Println("Username:", req.Username)
	fmt.Println("Password:", req.Password)
	// Respond With JSON ...!
	exist, err := dt.AlreadyExists(req.Username, req.Username)
	if err != nil {
		 
		return
	}
	if (!format.ValidUsername(req.Username) && !format.ValidEmail(req.Username)) || !format.ValidPassword(req.Password) || !exist {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "invalid credentials, try again",
		})
		return
	}
	userId, hash, err := dt.GetUserHashByUsername(req.Username)
	if err != nil {
		 
		return
	}
	if !helpers.CheckPassword(req.Password, hash) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "wrong password, try again",
		})
		return
	}
	session := GenerateToken(32)
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    session,
		Expires:  time.Now().Add(time.Hour),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	err = dt.UpdateUserSession(userId, session)
	if err != nil {
		return
	}
	json.NewEncoder(w).Encode(map[string]any{
		"status": "ok",
		"user_id" : userId,
	})
}

func GenerateToken(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		log.Fatalf("failed to generate token %v", err)
	}
	return base64.URLEncoding.EncodeToString(bytes)
}
