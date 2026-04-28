package chat

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
	repo "social-network-backend/internal/repository"
)

func canReactToDirectMessage(userID, messageID int) (bool, int, int, error) {
	var senderID, recipientID int
	err := repo.DB.QueryRow(`
		SELECT sender_id, recipient_id
		FROM messages
		WHERE id = ?
	`, messageID).Scan(&senderID, &recipientID)
	if err != nil {
		return false, 0, 0, err
	}

	canReact := userID == senderID || userID == recipientID
	return canReact, senderID, recipientID, nil
}

func canReactToGroupMessage(userID, messageID int) (bool, int, error) {
	var groupID int
	err := repo.DB.QueryRow(`
		SELECT group_id
		FROM group_messages
		WHERE id = ?
	`, messageID).Scan(&groupID)
	if err != nil {
		return false, 0, err
	}

	canChat, err := CanGroupChat(userID, groupID)
	if err != nil {
		return false, 0, err
	}

	return canChat, groupID, nil
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 2048
)

type Client struct {
	userID int
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var in IncomingMessage
		if err := json.Unmarshal(message, &in); err != nil {
			fmt.Println("[Chat] invalid message format:", err)
			continue
		}

		if in.Type == "reaction" {
			var newCount int
			var isLiked bool

			if in.GroupID > 0 {
				canReact, groupID, err := canReactToGroupMessage(c.userID, in.MessageID)
				if err != nil || !canReact {
					fmt.Printf("[Chat] User %d blocked from reacting to group message %d\n", c.userID, in.MessageID)
					continue
				}

				var exists int
				err = repo.DB.QueryRow(repo.IS_GROUP_MESSAGE_LIKED, in.MessageID, c.userID).Scan(&exists)
				if err == nil && exists == 1 {
					if _, err := repo.DB.Exec(repo.DELETE_GROUP_MESSAGE_REACTION, in.MessageID, c.userID); err != nil {
						fmt.Printf("[Chat] failed to remove group reaction: %v\n", err)
						continue
					}
					isLiked = false
				} else {
					if _, err := repo.DB.Exec(repo.INSERT_GROUP_MESSAGE_REACTION, in.MessageID, c.userID); err != nil {
						fmt.Printf("[Chat] failed to save group reaction: %v\n", err)
						continue
					}
					isLiked = true
				}

				if err := repo.DB.QueryRow(repo.GET_GROUP_MESSAGE_REACTION_COUNT, in.MessageID).Scan(&newCount); err != nil {
					fmt.Printf("[Chat] failed to count group reactions: %v\n", err)
					continue
				}

				broadcastData, _ := json.Marshal(map[string]interface{}{
					"type":       "reaction_update",
					"message_id": in.MessageID,
					"group_id":   groupID,
					"like_count": newCount,
					"reactor_id": c.userID,
					"is_liked":   isLiked,
				})
				c.hub.BroadcastToGroup(groupID, broadcastData)
			} else {
				canReact, senderID, recipientID, err := canReactToDirectMessage(c.userID, in.MessageID)
				if err != nil || !canReact {
					fmt.Printf("[Chat] User %d blocked from reacting to direct message %d\n", c.userID, in.MessageID)
					continue
				}

				var exists int
				err = repo.DB.QueryRow(repo.IS_MESSAGE_LIKED, in.MessageID, c.userID).Scan(&exists)
				if err == nil && exists == 1 {
					if _, err := repo.DB.Exec(repo.DELETE_MESSAGE_REACTION, in.MessageID, c.userID); err != nil {
						fmt.Printf("[Chat] failed to remove reaction: %v\n", err)
						continue
					}
					isLiked = false
				} else {
					if _, err := repo.DB.Exec(repo.INSERT_MESSAGE_REACTION, in.MessageID, c.userID); err != nil {
						fmt.Printf("[Chat] failed to save reaction: %v\n", err)
						continue
					}
					isLiked = true
				}

				if err := repo.DB.QueryRow(repo.GET_MESSAGE_REACTION_COUNT, in.MessageID).Scan(&newCount); err != nil {
					fmt.Printf("[Chat] failed to count reactions: %v\n", err)
					continue
				}

				broadcastData, _ := json.Marshal(map[string]interface{}{
					"type":         "reaction_update",
					"message_id":   in.MessageID,
					"like_count":   newCount,
					"reactor_id":   c.userID,
					"is_liked":     isLiked,
					"recipient_id": recipientID,
				})

				c.hub.BroadcastToUser(senderID, broadcastData)
				c.hub.BroadcastToUser(recipientID, broadcastData)
			}
			continue
		}

		// Permission check
		if in.Type == "group_chat" {
			canChat, err := CanGroupChat(c.userID, in.GroupID)
			if err != nil || !canChat {
				fmt.Printf("[Chat] User %d blocked from group %d chat\n", c.userID, in.GroupID)
				continue
			}
		} else {
			canChat, err := CanChat(c.userID, in.RecipientID)
			if err != nil || !canChat {
				fmt.Printf("[Chat] User %d blocked from chatting with %d\n", c.userID, in.RecipientID)
				continue
			}
		}

		// Handle typing status
		if in.Type == "typing" {
			msg := Message{
				Type:        "typing",
				SenderID:    c.userID,
				RecipientID: in.RecipientID,
				Content:     in.Content, // "start" or "stop"
			}
			c.hub.broadcast <- msg
			continue
		}

		// Enforce 300 character limit (using runaway count correctly for emojis)
		runes := []rune(in.Content)
		if len(runes) > 300 {
			in.Content = string(runes[:300])
		}

		// Save to DB
		var msg Message
		if in.Type == "group_chat" {
			msg, err = SaveGroupMessage(in.GroupID, c.userID, in.Content)
		} else {
			msg, err = SaveMessage(c.userID, in.RecipientID, in.Content)
		}

		if err != nil {
			fmt.Println("[Chat] failed to save message:", err)
			continue
		}

		// Broadcast
		c.hub.broadcast <- msg
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
