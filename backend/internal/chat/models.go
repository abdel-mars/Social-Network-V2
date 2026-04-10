package chat

import (
	"time"
)

type Message struct {
	ID          int       `json:"id"`
	Type        string    `json:"type"` // "chat" or "status"
	SenderID    int       `json:"sender_id"`
	RecipientID int       `json:"recipient_id"`
	Content     string    `json:"content"`
	SentAt      time.Time `json:"sent_at"`
	IsRead      bool      `json:"is_read"`
	Sender      struct {
		Username string  `json:"username"`
		Avatar   *string `json:"avatar"`
	} `json:"sender"`
	UserStatus *UserStatus `json:"user_status,omitempty"`
}

type UserStatus struct {
	UserID   int  `json:"user_id"`
	IsOnline bool `json:"is_online"`
}

type IncomingMessage struct {
	Type        string `json:"type"` // "chat" or "typing"
	RecipientID int    `json:"recipient_id"`
	Content     string `json:"content"`
}

type ConversationPreview struct {
	UserID      int       `json:"user_id"`
	Username    string    `json:"username"`
	Avatar      *string   `json:"avatar"`
	LastMessage string    `json:"last_message"`
	LastSentAt  time.Time `json:"last_sent_at"`
	UnreadCount int       `json:"unread_count"`
	IsOnline    bool      `json:"is_online"`
}
