package chat

import (
	"encoding/json"
	"fmt"
	"sync"
)

type Hub struct {
	clients    map[int]*Client
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[int]*Client),
		broadcast:  make(chan Message, 256), // Buffer to avoid blocking
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.userID] = client
			h.mu.Unlock()
			fmt.Printf("[Chat] User %d connected\n", client.userID)
			// Broadcast login
			h.broadcastStatus(client.userID, true)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.userID]; ok {
				delete(h.clients, client.userID)
				close(client.send)
				fmt.Printf("[Chat] User %d disconnected\n", client.userID)
			}
			h.mu.Unlock()
			// Broadcast logout
			h.broadcastStatus(client.userID, false)

		case message := <-h.broadcast:
			data, _ := json.Marshal(message)
			h.mu.RLock()

			if message.Type == "status" {
				// Global broadcast for status updates
				for _, client := range h.clients {
					select {
					case client.send <- data:
					default:
					}
				}
			} else {
				// Targeted message for chat
				if recipient, ok := h.clients[message.RecipientID]; ok {
					select {
					case recipient.send <- data:
					default:
					}
				}
				// Also send back to sender for confirmation
				if sender, ok := h.clients[message.SenderID]; ok {
					select {
					case sender.send <- data:
					default:
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) IsUserOnline(userID int) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, online := h.clients[userID]
	return online
}

func (h *Hub) broadcastStatus(userID int, isOnline bool) {
	if userID == 0 {
		return
	}
	msg := Message{
		Type: "status",
		UserStatus: &UserStatus{
			UserID:   userID,
			IsOnline: isOnline,
		},
	}
	fmt.Printf("[Chat] Broadcasting status for user %d: online=%v\n", userID, isOnline)
	h.broadcast <- msg
}
