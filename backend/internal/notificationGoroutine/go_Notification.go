package notificationgoroutine

import (
	"encoding/json"
	"fmt"
	Ch "social-network-backend/internal/repository"
	"social-network-backend/internal/sse"
)

// SendNotification is now a helper to trigger SSE notifications.
func SendNotification(notif Ch.Notification) {
	fmt.Printf("[Notification] Sending to user %d: %s\n", notif.UserID, notif.Type)
	sse.SendJSON(notif.UserID, notif)
}

// NotificationRemoval is the payload sent via SSE to tell the frontend to remove a notification.
type NotificationRemoval struct {
	Action   string `json:"action"`
	SenderID int    `json:"sender_id"`
	Type     string `json:"type"`
}

// SendNotificationRemoval tells the frontend to remove all notifications matching sender+type.
func SendNotificationRemoval(targetUserID, senderID int, notifType string) {
	removal := NotificationRemoval{
		Action:   "remove",
		SenderID: senderID,
		Type:     notifType,
	}
	data, err := json.Marshal(removal)
	if err != nil {
		fmt.Println("[Notification] marshal removal error:", err)
		return
	}
	fmt.Printf("[Notification] Sending removal to user %d: sender=%d type=%s\n", targetUserID, senderID, notifType)
	sse.Send(targetUserID, data)
}
