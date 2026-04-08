package servergo

import (
	"fmt"
	"net/http"
	initial "social-network-backend/internal/Initialdb"
	de "social-network-backend/internal/helpers"
	"social-network-backend/internal/auth"
	midle "social-network-backend/internal/Middleware"
	handler "social-network-backend/internal/handler"
)

// Her I Will Call Function Who Reponse ! To Execute DATABSE <!!>
func Dependencies() {
	// Her I Will Call The Function !! 
	initial.InitDB("./database/forum.db")
	de.InitRegex()
}

func Mux() *http.ServeMux {
	social := http.NewServeMux()
	// Real Time Socket Tunel Delivred State Of Users In The System !!
	// <<<<===============>> 
	social.HandleFunc("/ws", midle.AuthMiddleware(handler.Sockettunel))
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
	social.HandleFunc("/getposts", midle.AuthMiddleware(handler.Getposts))
	social.HandleFunc("/posts/", midle.AuthMiddleware(handler.Submitcomment))
	// <<==>>
	social.HandleFunc("/reactions", midle.AuthMiddleware(handler.Reaction))
	social.HandleFunc("/users-sug", midle.AuthMiddleware(handler.Getusers))
	social.HandleFunc("/toggle-follow", midle.AuthMiddleware(handler.Setfollowers))
	social.HandleFunc("/update-privacy", midle.AuthMiddleware(handler.UpdatePrivacy))
	//
	social.HandleFunc("/GetCUser/", midle.AuthMiddleware(handler.PostsUserProfile))
	social.HandleFunc("/Friends", midle.AuthMiddleware(handler.GetFriendlist))
	social.HandleFunc("/notifications", midle.AuthMiddleware(handler.Notification))
	social.HandleFunc("/request_follow",midle.AuthMiddleware(handler.Accept_or_reject))
	social.HandleFunc("/Create_Group", midle.AuthMiddleware(handler.Create_Group))
	social.HandleFunc("/Get_Groups", midle.AuthMiddleware(handler.Get_Groups))
	social.HandleFunc("/join", midle.AuthMiddleware(handler.Request_Join))
	social.HandleFunc("/accept-reject-join", midle.AuthMiddleware(handler.Accept_or_reject_join))
	social.HandleFunc("/Get_Group_By_ID/" ,midle.AuthMiddleware(handler.Get_Group_By_ID))
	social.HandleFunc("/Creat_Post_Groupe", midle.AuthMiddleware(handler.Create_Post_In_Groupe))
	// <<---->>..
	return social
}

func Runserver() {
	// Her We Will Run The Server Go To Intearact With Next-js
	// dont be panic this is the http.Server strcut
	// who is listenerserver it's depend on it to routing 
	// and handle redirection every endoint to theere handlers
	Server := &http.Server{
		Addr: ":8080",
		Handler: midle.CORSMiddleware(Mux()),
	}
	fmt.Println("THE SERVER IT'S RUNING NOW BE HAPPY FRIENDS")
	Server.ListenAndServe()
}