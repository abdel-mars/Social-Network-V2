package chat

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	repo "social-network-backend/internal/repository"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Adjust for production
	},
}

var ChatHub *Hub

func init() {
	ChatHub = NewHub()
}

func Handler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("[Chat] upgrade error:", err)
		return
	}

	client := &Client{userID: userID, hub: ChatHub, conn: conn, send: make(chan []byte, 256)}
	ChatHub.register <- client

	go client.ReadPump()
	go client.WritePump()
}

func GetHistoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	withIDStr := r.URL.Query().Get("with")
	withID, err := strconv.Atoi(withIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	history, err := GetHistory(userID, withID, 50)
	if err != nil {
		http.Error(w, "Failed to load history", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

func GetConversationsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	previews, err := GetConversations(userID)
	if err != nil {
		http.Error(w, "Failed to load conversations", http.StatusInternalServerError)
		return
	}

	for i := range previews {
		previews[i].IsOnline = ChatHub.IsUserOnline(previews[i].UserID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(previews)
}

func MarkAsReadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(repo.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var data struct {
		SenderID int `json:"sender_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := MarkAsRead(userID, data.SenderID); err != nil {
		http.Error(w, "Failed to mark messages as read", http.StatusInternalServerError)
		return
	}

	// Broadcast read receipt to both sender and recipient (for multi-tab sync)
	receipt, _ := json.Marshal(map[string]interface{}{
		"type":         "read_receipt",
		"sender_id":    data.SenderID, // The person whose messages were read
		"recipient_id": userID,        // The person who read them
	})
	ChatHub.BroadcastToUser(data.SenderID, receipt)
	ChatHub.BroadcastToUser(userID, receipt)
	fmt.Printf("[Chat] Broadcasted read_receipt to sender %d and recipient %d\n", data.SenderID, userID)

	w.WriteHeader(http.StatusOK)
}
