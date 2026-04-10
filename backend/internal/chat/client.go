package chat

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

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

		// Permission check
		canChat, err := CanChat(c.userID, in.RecipientID)
		if err != nil || !canChat {
			fmt.Printf("[Chat] User %d blocked from chatting with %d\n", c.userID, in.RecipientID)
			continue
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
		msg, err := SaveMessage(c.userID, in.RecipientID, in.Content)
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
