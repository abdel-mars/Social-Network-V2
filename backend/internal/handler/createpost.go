package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	key "social-network-backend/internal/repository"
	set "social-network-backend/internal/set_get_data_base"	
	"time"
	"os"
	"io"

)

func CreatePost(w http.ResponseWriter, r *http.Request) {
    fmt.Println("The Create Post It's Calling From Front")
    
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    userID := r.Context().Value(key.UserIDKey)
    if userID == nil {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    id, ok := userID.(int)
    if !ok {
        http.Error(w, "Invalid user ID", http.StatusInternalServerError)
        return
    }

    // <<<====>>> !!!!  
    err := r.ParseMultipartForm(10 << 20) //
    if err != nil {
        http.Error(w, "Error parsing form", http.StatusBadRequest)
        return
    }

    title := r.FormValue("title")
    content := r.FormValue("content")
    privacy := r.FormValue("privacy")
    if privacy == "" {
        privacy = "public"
    }

	var viewerIDs []int
	if privacy == "private" {
		viewersStr := r.FormValue("viewer_ids")
		if viewersStr != "" {
			var ids []int
			if err := json.Unmarshal([]byte(viewersStr), &ids); err == nil {
				viewerIDs = ids
			}
		}
	}

    // regular posts don't use group_id

    // if
    //  -====== > imges 
    var imagePath string
    file, handler, err := r.FormFile("image")
    if err == nil {
        defer file.Close()

        imagePath = fmt.Sprintf("uploads/%d_%s", time.Now().Unix(), handler.Filename)
        f, err := os.Create(imagePath)
        if err != nil {
            http.Error(w, "Cannot save image", http.StatusInternalServerError)
            return
        }
        defer f.Close()
        io.Copy(f, file)
    }

    ID, err := set.AddNewPost(id, title, content, imagePath, privacy, viewerIDs)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        fmt.Println("There is a problem in the database:", err)
        return
    }

    post, _ := set.GetAddedPost(int(ID))
    // <<===>> // 
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(post); err != nil {
        fmt.Println("Error encoding post:", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }
}

 