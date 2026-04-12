package repository

import (
	"database/sql"
	"regexp"
	"time"
)

var (
	EmailExp    *regexp.Regexp
	UsernameExp *regexp.Regexp
	DB          *sql.DB
)

// << Notification Struct {} >> .!
type Notification struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	SenderID  int       `json:"sender_id"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	State     string    `json:"state"`
	CreatedAt time.Time `json:"created_at"`
	// <<<=====>>> The_Sender_Data <<======>>
	Sender struct {
		ID        int    `json:"id"`
		Username  string `json:"username"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Avatar    string `json:"avatar"`
	} `json:"sender"`
	ReceiverIsPrivate bool   `json:"receiver_is_private"`
	IsFollowingSender bool   `json:"is_following_sender"`
	GroupTitle        string `json:"group_title"`
	GroupID           int    `json:"group_id"`
}

// <<<======>>> !!
type Old_Notificaion struct {
	Data   []Notification `json:"data"`
	Sender *Sender_data
}

// <<==>>  Send the Nootification whith the sender to front that's it

type NotificationWithSender struct {
	ID        int       `json:"id"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	State     string    `json:"state"`
	CreatedAt time.Time `json:"created_at"`
	Sender    struct {
		ID        int    `json:"id"`
		Username  string `json:"username"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Avatar    string `json:"avatar"`
	} `json:"sender"`
}

type Sender_data struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar"`
}
type Receiver_data struct {
	ID        int  `json:"id"`
	IsPrivate bool `json:"is_private"`
}

// Her I Will Declared In Shared Map And Chanell Where I Will Send Data To Notification !
// <<<===>>>
// <<====>> !_!
// Her This It's Key For Colision Will Not Happning When I Want To Set To Context Request and get

// / <==================================>
type contextKey string

const UserIDKey contextKey = "userID"

type User struct {
	ID        int     `json:"id"`
	Username  string  `json:"username"`
	Email     string  `json:"email"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Age       *int    `json:"age,omitempty"`
	Gender    *string `json:"gender,omitempty"`
	Nickname  *string `json:"nickname,omitempty"`
	About     *string `json:"about,omitempty"`
	Avatar    *string `json:"avatar,omitempty"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
	IsPrivate *int    `json:"is_private"`
}

// Post Letter !!....
type Post struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type Posts struct {
	ID            int     `json:"id"`
	UserID        int     `json:"user_id"`
	UserName      string  `json:"username"`
	FullName      string  `json:"full_name"`
	Avatar        *string `json:"avatar,omitempty"`
	Title         string  `json:"title"`
	Content       string  `json:"content"`
	ImagePath     *string `json:"image_path"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
	LikesCount    int     `json:"likes_count"`
	DislikesCount int     `json:"dislikes_count"`
	UserReaction  *string `json:"userReaction"`
	GroupID       int     `json:"group_id,omitempty"`
	GroupTitle    string  `json:"group_title,omitempty"`
}

type Sugg struct {
	// format json
	UserID    int     `json:"user_id"`
	UserName  string  `json:"username"`
	FullName  string  `json:"full_name"`
	ImagePath *string `json:"image_path"`
}

// ....<=====>....
// Users Limitations
const (
	// Email limitations
	EMAIL_MIN_LEN = 6   // a@b.co is a valid short email
	EMAIL_MAX_LEN = 254 // RFC 5321 max length of an email address

	// Username limitations
	USERNAME_MIN_LEN = 3
	USERNAME_MAX_LEN = 32 // Long enough, yet avoids abuse or awkward UI

	// Password limitations
	PASSWORD_MIN_LEN = 8  // Minimum for secure password
	PASSWORD_MAX_LEN = 72 // Bcrypt max input length

	// Post Title limitations
	TITLE_MIN_LEN = 10
	TITLE_MAX_LEN = 70 // Enough for concise titles; avoids clutter

	// Post Content limitations
	POST_MIN_LEN = 1
	POST_MAX_LEN = 10_000 // Long enough for article-style posts

	// Comment limitations
	COMMENT_MIN_LEN = 1
	COMMENT_MAX_LEN = 1_000 // Reasonable upper bound for a comment
)
