package handler 


import (
	"fmt"
	"net/http"
	"github.com/gorilla/websocket"
	key "social-network-backend/internal/repository"
)

// Her The Upgrade It's hapnning !!

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// <<<<======>>>> 
func Sockettunel(w http.ResponseWriter, r *http.Request) {
    // her i will track the usr who is send request by there id 
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Upgrade error:", err)
		return
	}
	// Her I Will <..|..> 
	fmt.Println("Client<->Connected<->To<->The<->Socket ")
	// Her_I_Will_Enregister_This_Connexion_Of_Client !!
	ID_USER := r.Context().Value(key.UserIDKey).(int) 
	key.Clients[ID_USER] = conn
}