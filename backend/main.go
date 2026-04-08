package main

import (
	"social-network-backend/internal/chat"
	"social-network-backend/internal/servergo"
)

func main() {
	// Here I Will Call The Function Who Will Star Server !!
	// Create Table Db In The First ...!
	// serve files under /uploads/
	// (==>|<==)
	// Go Routine About Notification <!-!> !!
	// Bismillahhe ... <!!>
	// servergo.Dependencies()
	go chat.ChatHub.Run()
	// <<===|===>> <<===>>>
	servergo.Dependencies()
	servergo.Runserver()
	//<<->>
}
