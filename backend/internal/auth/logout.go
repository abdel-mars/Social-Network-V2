package auth

import (
	"net/http"
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
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Logged out successfully"}`))
}