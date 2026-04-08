package main

import (
	"social-network-backend/internal/servergo"
	send "social-network-backend/internal/notificationGoroutine"
)

func main() {
	// Here I Will Call The Function Who Will Star Server !!
	// Create Table Db In The First ...! 
    // serve files under /uploads/
	// (==>|<==)  
	// Go Routine About Notification <!-!> !!
	// Bismillahhe ... <!!> 
	go send.SendNotification() // Represent 
	// <<===|===>> <<===>>> 
	servergo.Dependencies() 
	servergo.Runserver()
	//<<->>
}