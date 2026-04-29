package chat

import (
	"encoding/json"
	"fmt"
	"sync"
)

type Hub struct {
	clients    map[int]map[*Client]bool // userID -> set of clients
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[int]map[*Client]bool),
		broadcast:  make(chan Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.userID] == nil {
				h.clients[client.userID] = make(map[*Client]bool)
			}
			h.clients[client.userID][client] = true
			isFirst := len(h.clients[client.userID]) == 1
			h.mu.Unlock()

			if isFirst {
				fmt.Printf("[Chat] User %d connected\n", client.userID)
				h.broadcastStatus(client.userID, true)
				go h.broadcastGroupOnlineCount(client.userID)
			}

		case client := <-h.unregister:
			h.mu.Lock()
			if userClients, ok := h.clients[client.userID]; ok {
				if _, exists := userClients[client]; exists {
					delete(userClients, client)
					close(client.send)
					if len(userClients) == 0 {
						delete(h.clients, client.userID)
						h.mu.Unlock()
						fmt.Printf("[Chat] User %d disconnected\n", client.userID)
						h.broadcastStatus(client.userID, false)
						go h.broadcastGroupOnlineCount(client.userID)
					} else {
						h.mu.Unlock()
					}
				} else {
					h.mu.Unlock()
				}
			} else {
				h.mu.Unlock()
			}

		case message := <-h.broadcast:
			data, _ := json.Marshal(message)
			h.mu.RLock()

			if message.Type == "status" {
				for _, userClients := range h.clients {
					for client := range userClients {
						select {
						case client.send <- data:
						default:
						}
					}
				}
			} else if message.Type == "group_chat" {
				// Broadcast to all group members
				members, err := GetGroupMembers(message.GroupID)
				if err != nil {
					fmt.Printf("[Chat] failed to get group members for broadcasting: %v\n", err)
					h.mu.RUnlock()
					continue
				}
				for _, memberID := range members {
					if userClients, ok := h.clients[memberID]; ok {
						for client := range userClients {
							select {
							case client.send <- data:
							default:
							}
						}
					}
				}
			} else {
				// Send to all recipient's active sessions
				if userClients, ok := h.clients[message.RecipientID]; ok {
					for client := range userClients {
						select {
						case client.send <- data:
						default:
						}
					}
				}
				// Also send back to all sender's sessions for sync
				if message.SenderID != message.RecipientID {
					if userClients, ok := h.clients[message.SenderID]; ok {
						for client := range userClients {
							select {
							case client.send <- data:
							default:
							}
						}
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
	return len(h.clients[userID]) > 0
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
	h.broadcast <- msg
}

func (h *Hub) BroadcastToUser(userID int, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if userClients, ok := h.clients[userID]; ok {
		for client := range userClients {
			select {
			case client.send <- data:
			default:
			}
		}
	}
}

func (h *Hub) broadcastGroupOnlineCount(userID int) {
	groups, err := GetUserGroups(userID)
	if err != nil {
		fmt.Printf("[Chat] failed to get user groups for online count broadcast: %v\n", err)
		return
	}

	for _, groupID := range groups {
		members, err := GetGroupMembers(groupID)
		if err != nil {
			continue
		}

		onlineCount := 0
		for _, memberID := range members {
			if h.IsUserOnline(memberID) {
				onlineCount++
			}
		}

		msg := map[string]interface{}{
			"type":         "group_online_count",
			"group_id":     groupID,
			"online_count": onlineCount,
		}
		data, _ := json.Marshal(msg)

		for _, memberID := range members {
			h.BroadcastToUser(memberID, data)
		}
	}
}

func (h *Hub) BroadcastToGroup(groupID int, data []byte) {
	members, err := GetGroupMembers(groupID)
	if err != nil {
		fmt.Printf("[Chat] failed to get group members for broadcasting: %v\n", err)
		return
	}
	for _, memberID := range members {
		h.BroadcastToUser(memberID, data)
	}
}
