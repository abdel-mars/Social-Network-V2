package handler

import (
	"fmt"
	"net/http"
	key "social-network-backend/internal/repository"	 	
	"time"
	"encoding/json"
	"io"
	"os"
	"strconv"
)

func Create_Post_In_Groupe(w http.ResponseWriter, r *http.Request) {

	fmt.Println("There Is A User_Id")
	// <<===>> !!!! ... !!!! <<===>> 
	// <<===>> !!!! ... !!!! <<===>> 
    fmt.Println("The Create Post It's Calling From Front")
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    userID := r.Context().Value(key.UserIDKey).(int)
    // <<<====>>> !!!!  
    err := r.ParseMultipartForm(10 << 20) // === \\
    if err != nil {
        http.Error(w, "Error parsing form", http.StatusBadRequest)
        return
    }
    //  <======> Images ... 
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
    title := r.FormValue("title")
    content := r.FormValue("content")
	group_id ,_ := strconv.Atoi(r.FormValue("group_id")) 
	fmt.Println("the title :", title)
	fmt.Println("The content" ,content)
	fmt.Println("the group_id", group_id)
	fmt.Println("The User_id Of The Creator ==>", userID) 
	// insert data to the data_base !
	_, err = key.DB.Exec(`
    INSERT INTO group_posts (title, content, image, creator_id, group_id)
    VALUES (?, ?, ?, ?, ?)`,
    title, content, imagePath, userID, group_id,
	)

    ID, err := AddNewPosts(title, content, imagePath, userID, group_id)
    if err != nil {
        http.Error(w, "Database error", http.StatusInternalServerError)
        fmt.Println("There is a problem in the database:", err)
        return
    }
    fmt.Println("The Id of the last insert is", ID)
    post, _ := GetAd_post(int(ID))
    // <<===>> //
   
	fmt.Printf("The post at group it's set %v" , post)
	w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(post); err != nil {
        fmt.Println("Error encoding post:", err)
        //http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }
}

func AddNewPosts(title, content, imagePath string, userId, grouid int) (int64 , error){
	res, err := key.DB.Exec(`
    INSERT INTO group_posts (title, content, image, creator_id, group_id)
    VALUES (?, ?, ?, ?, ?)`,title, content, imagePath, userId, grouid)
   if err != nil {
        return -1, err  // <<===>> 
    }
    id, err := res.LastInsertId()
    if err != nil {
        fmt.Println("Warning: could not get LastInsertId:", err)
        return 0, nil // 
    }
    return id, nil
}

func GetAd_post(id int) (*key.Posts, error) {
    query := `
        SELECT gp.id, gp.creator_id, u.username, u.first_name || ' ' || u.last_name AS full_name,
               gp.title, gp.content, gp.image, gp.created_at, gp.created_at
        FROM group_posts gp
        JOIN users u ON gp.creator_id = u.id
        WHERE gp.id = ?
    `
    row := key.DB.QueryRow(query, id)
    var post key.Posts
    err := row.Scan(&post.ID, &post.UserID, &post.UserName, &post.FullName,
                    &post.Title, &post.Content, &post.ImagePath, &post.CreatedAt, &post.UpdatedAt)
    if err != nil {
        return nil, err
    }
    return &post, nil
}
