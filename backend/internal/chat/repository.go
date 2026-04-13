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
			u.id, 0 as group_id, u.username, u.avatar, 
			COALESCE(m.content, '') as last_message, 
			m.sent_at as last_sent_at,
			COALESCE((SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND recipient_id = ? AND is_read = 0), 0) as unread_count,
			0 as online_count
		FROM users u
		JOIN (
			SELECT followed_id as friend_id FROM followers WHERE follower_id = ? AND status = 'accepted'
			UNION
			SELECT follower_id as friend_id FROM followers WHERE followed_id = ? AND status = 'accepted'
		) friends ON u.id = friends.friend_id
		LEFT JOIN messages m ON m.id = (
			SELECT id FROM messages 
			WHERE (sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id)
			ORDER BY sent_at DESC LIMIT 1
		)
		UNION ALL
		SELECT 
			0 as id, g.id as group_id, g.title as username, g.avatar as avatar,
			COALESCE(gm.content, '') as last_message,
			gm.sent_at as last_sent_at,
			(SELECT COUNT(*) FROM group_messages WHERE group_id = g.id AND id > mem.last_seen_message_id) as unread_count,
			0 as online_count
		FROM groups g
		JOIN group_members mem ON g.id = mem.group_id
		LEFT JOIN (
			SELECT group_id, content, sent_at
			FROM group_messages
			WHERE id IN (SELECT MAX(id) FROM group_messages GROUP BY group_id)
		) gm ON g.id = gm.group_id
		WHERE mem.user_id = ? AND mem.status = 'member'

		ORDER BY last_sent_at DESC, username ASC
	`, userID, userID, userID, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var previews []ConversationPreview
	for rows.Next() {
		var p ConversationPreview
		var lastSentAt sql.NullTime
		if err := rows.Scan(
			&p.UserID, &p.GroupID, &p.Username, &p.Avatar,
			&p.LastMessage, &lastSentAt, &p.UnreadCount, &p.OnlineCount,
		); err != nil {
			return nil, err
		}
		if lastSentAt.Valid {
			p.LastSentAt = lastSentAt.Time
		}
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

func SaveGroupMessage(groupID, senderID int, content string) (Message, error) {
	var m Message
	result, err := repo.DB.Exec(`
		INSERT INTO group_messages (group_id, sender_id, content)
		VALUES (?, ?, ?)
	`, groupID, senderID, content)
	if err != nil {
		return m, err
	}

	id, _ := result.LastInsertId()
	m.ID = int(id)
	m.Type = "group_chat"
	m.SenderID = senderID
	m.GroupID = groupID
	m.Content = content

	// Fetch timestamp
	err = repo.DB.QueryRow(`
		SELECT sent_at FROM group_messages WHERE id = ?
	`, m.ID).Scan(&m.SentAt)

	// Fetch sender info
	err = repo.DB.QueryRow(`
		SELECT username, avatar FROM users WHERE id = ?
	`, senderID).Scan(&m.Sender.Username, &m.Sender.Avatar)

	return m, err
}

func GetGroupHistory(groupID int, limit int) ([]Message, error) {
	rows, err := repo.DB.Query(`
		SELECT m.id, m.sender_id, m.group_id, m.content, m.sent_at, u.username, u.avatar
		FROM group_messages m
		JOIN users u ON m.sender_id = u.id
		WHERE m.group_id = ?
		ORDER BY m.sent_at DESC
		LIMIT ?
	`, groupID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SenderID, &m.GroupID, &m.Content, &m.SentAt, &m.Sender.Username, &m.Sender.Avatar); err != nil {
			return nil, err
		}
		m.Type = "group_chat"
		messages = append([]Message{m}, messages...)
	}
	return messages, nil
}

func GetGroupMembers(groupID int) ([]int, error) {
	rows, err := repo.DB.Query(`
		SELECT user_id FROM group_members WHERE group_id = ? AND status = 'member'
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, id)
	}
	return userIDs, nil
}

func CanGroupChat(userID, groupID int) (bool, error) {
	var status string
	err := repo.DB.QueryRow(`
		SELECT status FROM group_members WHERE group_id = ? AND user_id = ?
	`, groupID, userID).Scan(&status)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return status == "member", nil
}

func UpdateGroupLastSeen(groupID, userID int) error {
	// Get the latest message ID for this group
	var lastMsgID int
	err := repo.DB.QueryRow(`SELECT COALESCE(MAX(id), 0) FROM group_messages WHERE group_id = ?`, groupID).Scan(&lastMsgID)
	if err != nil {
		return err
	}

	_, err = repo.DB.Exec(`
		UPDATE group_members 
		SET last_seen_message_id = ? 
		WHERE group_id = ? AND user_id = ?
	`, lastMsgID, groupID, userID)
	return err
}
