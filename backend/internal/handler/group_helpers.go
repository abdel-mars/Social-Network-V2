package handler

import (
	"database/sql"
	repo "social-network-backend/internal/repository"
)

func GetGroupMemberStatus(groupID, userID int) (string, error) {
	var status sql.NullString
	err := repo.DB.QueryRow(`SELECT status FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, userID).Scan(&status)
	if err != nil {
		if err == sql.ErrNoRows {
			return "not_member", nil
		}
		return "", err
	}
	if status.Valid {
		return status.String, nil
	}
	return "not_member", nil
}

func EnsureGroupMembership(groupID, userID int, status string) error {
	res, err := repo.DB.Exec(`UPDATE group_members SET status = ? WHERE group_id = ? AND user_id = ?`, status, groupID, userID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows > 0 {
		return nil
	}
	_, err = repo.DB.Exec(`INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)`, groupID, userID, status)
	return err
}

func IsGroupMember(groupID, userID int) (bool, error) {
	status, err := GetGroupMemberStatus(groupID, userID)
	if err != nil {
		return false, err
	}
	return status == "member", nil
}

func GroupExists(groupID int) (bool, error) {
	var id int
	err := repo.DB.QueryRow(`SELECT id FROM groups WHERE id = ?`, groupID).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func GetGroupCreatorID(groupID int) (int, error) {
	var creatorID int
	err := repo.DB.QueryRow(`SELECT creator_id FROM groups WHERE id = ?`, groupID).Scan(&creatorID)
	if err != nil {
		return 0, err
	}
	return creatorID, nil
}
