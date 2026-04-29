package middleware

import (
	"context"
	"fmt"
	"net/http"
	key "social-network-backend/internal/repository"
	se "social-network-backend/internal/set_get_data_base"
)

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("AuthMiddleware hit", r.Method, r.URL.Path)
		ses, err := r.Cookie("session")
		if err != nil {
			http.Error(w, `{"message":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		fmt.Println("The User Id is Here ")
		fmt.Println(ses)
		userID, _, err := se.SelectUserSession(ses.Value) 
		fmt.Println("The User Id is Here NOW ..........")
		fmt.Println(userID)
		if err != nil {
			http.Error(w, `{"message":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		fmt.Println("im here .................")
		// Store user ID in context
		ctx := context.WithValue(r.Context(), key.UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        // Mirror the origin if it matches our dev ports to satisfy browser strictness (especially Firefox)
        if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
            w.Header().Set("Access-Control-Allow-Origin", origin)
        } else {
            // Fallback default
            w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
        }

        w.Header().Set("Access-Control-Allow-Credentials", "true")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With, Cache-Control, Last-Event-ID")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        w.Header().Set("Access-Control-Max-Age", "3600")

        // Preflight request
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        next.ServeHTTP(w, r)
    })
}

 