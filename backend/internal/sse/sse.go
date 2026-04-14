package sse

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	key "social-network-backend/internal/repository"
)

// client represents a single SSE connection for a user.
type client struct {
	userID int
	ch     chan []byte
}

var (
	mu      sync.RWMutex
	clients = make(map[int]*client)
)

// Register creates an SSE channel for the given user and stores it.
// Returns the channel the caller should read from to send events.
func Register(userID int) chan []byte {
	mu.Lock()
	defer mu.Unlock()

	// Close any existing connection for this user (e.g. re-connect)
	if old, ok := clients[userID]; ok {
		close(old.ch)
	}

	ch := make(chan []byte, 16)
	clients[userID] = &client{userID: userID, ch: ch}
	return ch
}

// Unregister removes the SSE client and closes its channel.
func Unregister(userID int) {
	mu.Lock()
	defer mu.Unlock()

	if c, ok := clients[userID]; ok {
		close(c.ch)
		delete(clients, userID)
	}
}

// Send delivers a JSON payload to a connected user.
// If the user is not connected, the event is silently dropped.
func Send(userID int, data []byte) {
	mu.RLock()
	c, ok := clients[userID]
	mu.RUnlock()

	if !ok {
		fmt.Println("[SSE] user not connected:", userID)
		return
	}

	select {
	case c.ch <- data:
	default:
		// Channel full — drop to avoid blocking
		fmt.Println("[SSE] channel full for user:", userID)
	}
}

// SendJSON marshals v to JSON and sends it to the user.
func SendJSON(userID int, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		fmt.Println("[SSE] marshal error:", err)
		return
	}
	Send(userID, data)
}

// Handler is the HTTP handler for the /events endpoint.
// It registers the user, streams events, and cleans up on disconnect.
func Handler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(key.UserIDKey).(int)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Flush immediately to signal the connection is established
	flusher.Flush()

	ch := Register(userID)
	defer Unregister(userID)

	fmt.Printf("[SSE] user %d connected\n", userID)

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("[SSE] user %d disconnected\n", userID)
			return
		case <-ticker.C:
			// Send a keep-alive comment
			fmt.Fprintf(w, ": keep-alive\n\n")
			flusher.Flush()
		case data, open := <-ch:
			if !open {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
