package auth

import (
	"encoding/json"
	"net/http"
	Go "social-network-backend/internal/set_get_data_base"
)

func CheckState(w http.ResponseWriter, r *http.Request) {
	session, err := r.Cookie("session")
	if err != nil { 
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"authenticated": false,
		})
		return
	}

	id, login, err := Go.SelectUserSession(session.Value)
	if err != nil || !login {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"authenticated": false,
		})
		return
	}
	
	json.NewEncoder(w).Encode(map[string]any{
		"authenticated": true,
		"userID":        id,
	})
}
