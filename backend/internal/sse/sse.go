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
	clients = make(map[int]map[*client]struct{})
)

// Register creates an SSE channel for the given user and stores it.
// Returns the client which the caller should use to read events and unregister later.
func Register(userID int) *client {
	mu.Lock()
	defer mu.Unlock()

	if clients[userID] == nil {
		clients[userID] = make(map[*client]struct{})
	}

	ch := make(chan []byte, 16)
	c := &client{userID: userID, ch: ch}
	clients[userID][c] = struct{}{}
	return c
}

// Unregister removes the specific SSE client and closes its channel.
func Unregister(c *client) {
	mu.Lock()
	defer mu.Unlock()

	if userClients, ok := clients[c.userID]; ok {
		if _, exists := userClients[c]; exists {
			close(c.ch)
			delete(userClients, c)
		}
		if len(userClients) == 0 {
			delete(clients, c.userID)
		}
	}
}

// Send delivers a JSON payload to a connected user.
// If the user is not connected, the event is silently dropped.
func Send(userID int, data []byte) {
	mu.RLock()
	userClients, ok := clients[userID]
	if !ok || len(userClients) == 0 {
		mu.RUnlock()
		fmt.Println("[SSE] user not connected:", userID)
		return
	}

	// Copy the clients to avoid holding the lock during send
	var activeClients []*client
	for c := range userClients {
		activeClients = append(activeClients, c)
	}
	mu.RUnlock()

	for _, c := range activeClients {
		select {
		case c.ch <- data:
		default:
			// Channel full — drop to avoid blocking
			fmt.Println("[SSE] channel full for user:", userID)
		}
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

	c := Register(userID)
	defer Unregister(c)

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
		case data, open := <-c.ch:
			if !open {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}

// BroadcastToGroup sends an event to all connected members of a group.
func BroadcastToGroup(groupID int, v any) {
	// 1. Get all members of the group
	rows, err := key.DB.Query(`SELECT user_id FROM group_members WHERE group_id = ? AND status = 'member'`, groupID)
	if err != nil {
		fmt.Println("[SSE] failed to get group members:", err)
		return
	}
	defer rows.Close()

	// 2. Marshal data once
	data, err := json.Marshal(v)
	if err != nil {
		fmt.Println("[SSE] marshal error:", err)
		return
	}

	// 3. Send to each member who is currently connected
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		Send(userID, data)
	}
}
