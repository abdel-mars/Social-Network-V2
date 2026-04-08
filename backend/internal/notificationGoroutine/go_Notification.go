package notificationgoroutine


import (
	"fmt"
	Ch "social-network-backend/internal/repository"
	"github.com/gorilla/websocket"
    "encoding/json"
)

// <====>> .<!>. .<?>. .<.> ..

// A Go rouitne function who is wait to the notification it's will send and boooom u can send notification to the client base on the event !!!
func SendNotification() {
	// That's It !! 
	fmt.Println("Hello Im Her At GO Routine ")
    for notif := range Ch.Notification_01{

        conn, ok := Ch.Clients[notif.UserID]
        if !ok {
            fmt.Println("User not connected:", notif.UserID)
            continue
        }
        notifSlice := []Ch.Notification{notif}

		data, err := json.Marshal(notifSlice)
		if err != nil {
			fmt.Println("JSON marshal error:", err)
			continue
		}

        err = conn.WriteMessage(websocket.TextMessage, []byte(data))
        if err != nil {
            fmt.Println("Write error:", err)
            delete(Ch.Clients, notif.UserID)
        }
    }
}

