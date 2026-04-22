package servergo

import (
	"fmt"
	"net/http"
	initial "social-network-backend/internal/Initialdb"
	midle "social-network-backend/internal/Middleware"
	"social-network-backend/internal/auth"
	"social-network-backend/internal/chat"
	handler "social-network-backend/internal/handler"
	de "social-network-backend/internal/helpers"
	"social-network-backend/internal/sse"
)

// Her I Will Call Function Who Reponse ! To Execute DATABSE <!!>
func Dependencies() {
	// Her I Will Call The Function !!
	initial.InitDB("./database/forum.db")
	de.InitRegex()
}

func Mux() *http.ServeMux {
	social := http.NewServeMux()
	// SSE endpoint for notifications
	social.HandleFunc("/events", midle.AuthMiddleware(sse.Handler))
	// WebSocket endpoint for chat
	social.HandleFunc("/ws/chat", midle.AuthMiddleware(chat.Handler))
	social.HandleFunc("/chat/messages", midle.AuthMiddleware(chat.GetHistoryHandler))
	social.HandleFunc("/chat/conversations", midle.AuthMiddleware(chat.GetConversationsHandler))
	social.HandleFunc("/chat/read", midle.AuthMiddleware(chat.MarkAsReadHandler))
	social.HandleFunc("/group/chat/messages", midle.AuthMiddleware(handler.GetGroupChatHistory))

	// This The First Handler Of Login
	// HER I WILL CREATE API FOR REDIRECT THE / END POINT BY STATE OF CURRENT USER !
	social.HandleFunc("/uploads", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/uploads/", http.StatusMovedPermanently)
	})
	social.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
	social.HandleFunc("/checkstate", auth.CheckState)
	social.HandleFunc("/login", auth.Login)
	social.HandleFunc("/logout", auth.Logout)
	social.HandleFunc("/register", auth.Register)
	social.HandleFunc("/profile/", midle.AuthMiddleware(handler.Profile))

	//
	social.HandleFunc("/Createpost", midle.AuthMiddleware(handler.CreatePost))
	social.HandleFunc("/post/update", midle.AuthMiddleware(handler.Update_Post))
	social.HandleFunc("/post/delete", midle.AuthMiddleware(handler.Delete_Post))
	social.HandleFunc("/getposts", midle.AuthMiddleware(handler.Getposts))
	social.HandleFunc("/posts/", midle.AuthMiddleware(handler.Submitcomment))
	// <<==>>
	social.HandleFunc("/reactions", midle.AuthMiddleware(handler.Reaction))
	social.HandleFunc("/users-sug", midle.AuthMiddleware(handler.Getusers))
	social.HandleFunc("/search-users", midle.AuthMiddleware(handler.SearchUsers))
	social.HandleFunc("/toggle-follow", midle.AuthMiddleware(handler.Setfollowers))
	social.HandleFunc("/update-privacy", midle.AuthMiddleware(handler.UpdatePrivacy))
	social.HandleFunc("/profile/update", midle.AuthMiddleware(handler.UpdateProfile))
	//
	social.HandleFunc("/GetCUser/", midle.AuthMiddleware(handler.PostsUserProfile))
	social.HandleFunc("/Friends", midle.AuthMiddleware(handler.GetFriendlist))
	social.HandleFunc("/my-followers", midle.AuthMiddleware(handler.GetMyFollowers))
	social.HandleFunc("/notifications", midle.AuthMiddleware(handler.Notification))
	social.HandleFunc("/notifications/read", midle.AuthMiddleware(handler.MarkNotificationsRead))
	social.HandleFunc("/notifications/clear", midle.AuthMiddleware(handler.ClearNotifications))
	social.HandleFunc("/request_follow", midle.AuthMiddleware(handler.Accept_or_reject))
	social.HandleFunc("/Create_Group", midle.AuthMiddleware(handler.Create_Group))
	social.HandleFunc("/Get_Groups", midle.AuthMiddleware(handler.Get_Groups))
	social.HandleFunc("/join", midle.AuthMiddleware(handler.Request_Join))
	social.HandleFunc("/group/invite", midle.AuthMiddleware(handler.Invite_To_Group))
	social.HandleFunc("/group/invite/respond", midle.AuthMiddleware(handler.Respond_Group_Invite))
	social.HandleFunc("/group/leave", midle.AuthMiddleware(handler.Leave_Group))
	social.HandleFunc("/group/delete", midle.AuthMiddleware(handler.Delete_Group))
	social.HandleFunc("/accept-reject-join", midle.AuthMiddleware(handler.Accept_or_reject_join))
	social.HandleFunc("/Get_Group_By_ID/", midle.AuthMiddleware(handler.Get_Group_By_ID))
	social.HandleFunc("/Creat_Post_Groupe", midle.AuthMiddleware(handler.Create_Post_In_Groupe))
	social.HandleFunc("/group-post/update", midle.AuthMiddleware(handler.Update_Group_Post))
	social.HandleFunc("/group-post/delete", midle.AuthMiddleware(handler.Delete_Group_Post))
	social.HandleFunc("/group-event/create", midle.AuthMiddleware(handler.Create_Group_Event))
	social.HandleFunc("/group-event/respond", midle.AuthMiddleware(handler.Respond_Group_Event))
	// <<---->>..
	return social
}

func Runserver() {
	// Her We Will Run The Server Go To Intearact With Next-js
	// dont be panic this is the http.Server strcut
	// who is listenerserver it's depend on it to routing
	// and handle redirection every endoint to theere handlers
	Server := &http.Server{
		Addr:    ":8080",
		Handler: midle.CORSMiddleware(Mux()),
	}
	fmt.Println("THE SERVER IT'S RUNING NOW BE HAPPY FRIENDS")
	if err := Server.ListenAndServe(); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}
