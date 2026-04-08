package notificationgoroutine

import (
	"fmt"
	Ch "social-network-backend/internal/repository"
	"social-network-backend/internal/sse"
)

// SendNotification is now a helper to trigger SSE notifications.
func SendNotification(notif Ch.Notification) {
	fmt.Printf("[Notification] Sending to user %d: %s\n", notif.UserID, notif.Type)
	sse.SendJSON(notif.UserID, notif)
}
