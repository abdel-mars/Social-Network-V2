package servergo

import (
	"fmt"
	"net/http"
	"os"
	"strings"

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

// Router mounts the API under /api and keeps /uploads at the root.
//
// The API cannot share the root with the Next.js frontend: the backend
// registers "/profile/" as a subtree, so Go's ServeMux would 301 "/profile"
// to "/profile/" and shadow the frontend's own /profile page. Nesting every
// API route under /api makes the two route spaces disjoint. StripPrefix moves
// all routes at once, so the handlers above keep their existing paths.
//
// Uploaded files stay at the root because the database already stores values
// like "uploads/photo.jpeg", which the frontend builds as ${API_URL}/${value}.
func Router() *http.ServeMux {
	root := http.NewServeMux()
	root.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
	root.Handle("/api/", http.StripPrefix("/api", Mux()))
	return root
}

// registerTree registers a path both exactly and as a subtree.
//
// ServeMux answers a request for "/profile" with a 301 to "/profile/" when only
// "/profile/" is registered. That redirect is built from the already-stripped
// path, so its Location header loses the /api prefix and escapes to the
// frontend. Registering the exact path too serves those requests directly.
func registerTree(mux *http.ServeMux, path string, h http.HandlerFunc) {
	mux.HandleFunc(path, h)
	mux.HandleFunc(strings.TrimSuffix(path, "/"), h)
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
	social.HandleFunc("/checkstate", auth.CheckState)
	social.HandleFunc("/login", auth.Login)
	social.HandleFunc("/logout", auth.Logout)
	social.HandleFunc("/register", auth.Register)
	registerTree(social, "/profile/", midle.AuthMiddleware(handler.Profile))

	//
	social.HandleFunc("/Createpost", midle.AuthMiddleware(handler.CreatePost))
	social.HandleFunc("/post/update", midle.AuthMiddleware(handler.Update_Post))
	social.HandleFunc("/post/delete", midle.AuthMiddleware(handler.Delete_Post))
	social.HandleFunc("/getposts", midle.AuthMiddleware(handler.Getposts))
	registerTree(social, "/posts/", midle.AuthMiddleware(handler.Submitcomment))
	// <<==>>
	social.HandleFunc("/reactions", midle.AuthMiddleware(handler.Reaction))
	social.HandleFunc("/users-sug", midle.AuthMiddleware(handler.Getusers))
	social.HandleFunc("/search-users", midle.AuthMiddleware(handler.SearchUsers))
	social.HandleFunc("/toggle-follow", midle.AuthMiddleware(handler.Setfollowers))
	social.HandleFunc("/update-privacy", midle.AuthMiddleware(handler.UpdatePrivacy))
	social.HandleFunc("/profile/update", midle.AuthMiddleware(handler.UpdateProfile))
	//
	registerTree(social, "/GetCUser/", midle.AuthMiddleware(handler.PostsUserProfile))
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
	registerTree(social, "/Get_Group_By_ID/", midle.AuthMiddleware(handler.Get_Group_By_ID))
	social.HandleFunc("/Creat_Post_Groupe", midle.AuthMiddleware(handler.Create_Post_In_Groupe))
	social.HandleFunc("/group-post/update", midle.AuthMiddleware(handler.Update_Group_Post))
	social.HandleFunc("/group-post/delete", midle.AuthMiddleware(handler.Delete_Group_Post))
	social.HandleFunc("/group-event/create", midle.AuthMiddleware(handler.Create_Group_Event))
	social.HandleFunc("/group-event/respond", midle.AuthMiddleware(handler.Respond_Group_Event))
	social.HandleFunc("/group-event/delete", midle.AuthMiddleware(handler.Delete_Group_Event))
	// <<---->>..
	return social
}

func Runserver() {
	// Her We Will Run The Server Go To Intearact With Next-js
	// dont be panic this is the http.Server strcut
	// who is listenerserver it's depend on it to routing
	// and handle redirection every endoint to theere handlers
	Server := &http.Server{
		Addr:    ":" + port(),
		Handler: midle.CORSMiddleware(Router()),
	}
	fmt.Println("THE SERVER IT'S RUNING NOW BE HAPPY FRIENDS")
	if err := Server.ListenAndServe(); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}
