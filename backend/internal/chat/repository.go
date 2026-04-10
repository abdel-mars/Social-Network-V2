package chat

import (
	"database/sql"
	"fmt"
	repo "social-network-backend/internal/repository"
)

func SaveMessage(senderID, recipientID int, content string) (Message, error) {
	var m Message
	result, err := repo.DB.Exec(`
		INSERT INTO messages (sender_id, recipient_id, content)
		VALUES (?, ?, ?)
	`, senderID, recipientID, content)
	if err != nil {
		return m, err
	}

	id, _ := result.LastInsertId()
	m.ID = int(id)
	m.Type = "chat"
	m.SenderID = senderID
	m.RecipientID = recipientID
	m.Content = content

	// Fetch sender info for the broadcast
	err = repo.DB.QueryRow(`
		SELECT username, avatar, created_at FROM messages WHERE id = ?
	`, m.ID).Scan(&m.SentAt) // We just need the timestamp from DB

	err = repo.DB.QueryRow(`
		SELECT username, avatar FROM users WHERE id = ?
	`, senderID).Scan(&m.Sender.Username, &m.Sender.Avatar)

	return m, err
}

func GetHistory(userA, userB int, limit int) ([]Message, error) {
	rows, err := repo.DB.Query(`
		SELECT m.id, m.sender_id, m.recipient_id, m.content, m.sent_at, m.is_read, u.username, u.avatar
		FROM messages m
		JOIN users u ON m.sender_id = u.id
		WHERE (m.sender_id = ? AND m.recipient_id = ?)
		   OR (m.sender_id = ? AND m.recipient_id = ?)
		ORDER BY m.sent_at DESC
		LIMIT ?
	`, userA, userB, userB, userA, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SenderID, &m.RecipientID, &m.Content, &m.SentAt, &m.IsRead, &m.Sender.Username, &m.Sender.Avatar); err != nil {
			return nil, err
		}
		messages = append([]Message{m}, messages...) // Prepend to keep chronological order
	}
	return messages, nil
}

func CanChat(senderID, recipientID int) (bool, error) {
	// Logic: at least one of the users must be following the other.
	var count int
	err := repo.DB.QueryRow(`
		SELECT COUNT(*) FROM followers 
		WHERE status = 'accepted' AND (
			(follower_id = ? AND followed_id = ?) OR 
			(follower_id = ? AND followed_id = ?)
		)
	`, senderID, recipientID, recipientID, senderID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func GetConversations(userID int) ([]ConversationPreview, error) {
	// Find all unique friends (A follows B or B follows A)
	// and join with the last message if it exists.
	rows, err := repo.DB.Query(`
		SELECT 
			u.id, u.username, u.avatar, 
			COALESCE(m.content, '') as last_message, 
			m.sent_at as last_sent_at,
			COALESCE(counts.unread_count, 0) as unread_count
		FROM users u
		JOIN (
			SELECT followed_id as friend_id FROM followers WHERE follower_id = ? AND status = 'accepted'
			UNION
			SELECT follower_id as friend_id FROM followers WHERE followed_id = ? AND status = 'accepted'
		) friends ON u.id = friends.friend_id
		LEFT JOIN (
			SELECT 
				CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as other_id,
				MAX(id) as last_msg_id
			FROM messages
			WHERE sender_id = ? OR recipient_id = ?
			GROUP BY other_id
		) last_msgs ON u.id = last_msgs.other_id
		LEFT JOIN messages m ON m.id = last_msgs.last_msg_id
		LEFT JOIN (
			SELECT sender_id, recipient_id, COUNT(*) as unread_count
			FROM messages
			WHERE is_read = 0
			GROUP BY sender_id, recipient_id
		) counts ON u.id = counts.sender_id AND counts.recipient_id = ?
		ORDER BY m.sent_at DESC, u.username ASC
	`, userID, userID, userID, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var previews []ConversationPreview
	for rows.Next() {
		var p ConversationPreview
		var lastSentAt sql.NullTime
		var unreadCount sql.NullInt32
		if err := rows.Scan(&p.UserID, &p.Username, &p.Avatar, &p.LastMessage, &lastSentAt, &unreadCount); err != nil {
			return nil, err
		}
		if lastSentAt.Valid {
			p.LastSentAt = lastSentAt.Time
		}
		p.UnreadCount = int(unreadCount.Int32)
		previews = append(previews, p)
	}
	return previews, nil
}

func MarkAsRead(recipientID, senderID int) error {
	result, err := repo.DB.Exec(`
		UPDATE messages 
		SET is_read = 1 
		WHERE recipient_id = ? AND sender_id = ? AND is_read = 0
	`, recipientID, senderID)
	if err == nil {
		rows, _ := result.RowsAffected()
		if rows > 0 {
			fmt.Printf("[Chat] MarkAsRead: Marked %d messages as read for sender %d by recipient %d\n", rows, senderID, recipientID)
		}
	}
	return err
}
