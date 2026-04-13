package auth

import (
	"net/http"
	dt "social-network-backend/internal/set_get_data_base"
)

func Logout(w http.ResponseWriter, r *http.Request) {
	// Here I Will \\
	// D==== \\
	cookie := &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	}
	http.SetCookie(w, cookie)
	// logout ...... > !
	ses, err := r.Cookie("session")
	if err == nil {
		dt.ResetUserSession(ses.Value)
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Logged out successfully"}`))
}
