package setgetdatabase

import (
	"database/sql"
	"errors"

	"log"
	repo "social-network-backend/internal/repository"
	"time"
)

func SelectUserSession(session_id string) (int, bool, error) {
	var userId int
	err := repo.DB.QueryRow(repo.SELECT_USER_BY_SESSION_TOKEN, session_id).Scan(&userId)
	if err != nil {
		return userId, false, err
	}
	return userId, true, nil
}

func UpdateUserSession(id int, token string) error {
	_, err := repo.DB.Exec(repo.INSERT_NEW_SESSION, id, token)
	if err != nil {
		log.Println("Insert error:", err)
		return err
	}
	return nil
}

func ResetUserSession(session_id string) (bool, error) {
	_, err := repo.DB.Exec(repo.RESET_USER_SESSION_TOKEN, session_id)
	if err != nil {
		return false, err
	}
	return true, nil
}

func AlreadyExists(username, email string) (bool, error) {
	var count int
	err := repo.DB.QueryRow(repo.SELECT_USER_COUNT_BY_USERNAME_EMAIL, username, email).Scan(&count)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return count > 0, nil
}

func GetUserHashByUsername(username string) (int, string, error) {
	var hash string
	var id int
	err := repo.DB.QueryRow(repo.SELECT_USERID_PASSHASH_BY_USERNAME_EMAIL, username, username).Scan(&id, &hash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return id, hash, nil
		}
		return id, hash, err
	}
	return id, hash, nil
}

func GetUserInfo(userId int) (repo.User, error) {
	var user repo.User

	var dob sql.NullString
	var gender sql.NullString
	var nickname sql.NullString
	var about sql.NullString
	var avatar sql.NullString
	var cover sql.NullString
	var isPrivate sql.NullBool // Changed from sql.NullInt64 to sql.NullBool

	err := repo.DB.QueryRow(repo.SELECT_USER_BY_ID, userId).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.FirstName,
		&user.LastName,
		&dob,
		&gender,
		&nickname,
		&about,
		&avatar,
		&cover,
		&user.CreatedAt,
		&user.UpdatedAt,
		&isPrivate, // Now using sql.NullBool
	)

	if err != nil {
		return user, err
	}

	if dob.Valid {
		user.DateOfBirth = &dob.String
	}
	if gender.Valid {
		user.Gender = &gender.String
	}
	if nickname.Valid {
		user.Nickname = &nickname.String
	}
	if about.Valid {
		user.About = &about.String
	}
	if avatar.Valid {
		user.Avatar = &avatar.String
	}
	if cover.Valid {
		user.Cover = &cover.String
	}
	if isPrivate.Valid {
		var privateInt int
		if isPrivate.Bool {
			privateInt = 1
		} else {
			privateInt = 0
		}
		user.IsPrivate = &privateInt
	}

	return user, nil
}

/*
	func AddNewUser(username, email, hashedPass string) error {
		_, err := repo.DB.Exec(repo.INSERT_USERNAME_EMAIL_PASSHASH, username, email, hashedPass)
		return err
	}
*/
func AddNewUser(username, email, hashedPass, firstName, lastName, gender string, dob string, nickname, about, avatar, cover string) error {
	_, err := repo.DB.Exec(
		repo.INSERT_USERNAME_EMAIL_PASSHASH,
		username, email, hashedPass, firstName, lastName, dob, gender, nickname, about, avatar, cover,
	)
	return err
}

func GetUserHashById(id int) (string, error) {
	var hash string
	err := repo.DB.QueryRow(repo.SELECT_PASSHASH_BY_USERID, id).Scan(&hash)
	if err != nil {
		return hash, err
	}
	return hash, nil
}

func DupplicatedUsername(username string) (bool, error) {
	var count int
	err := repo.DB.QueryRow(repo.CHECK_USERNAME_DUP, username).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func UpdateUsernmae(id int, username string) error {
	res, err := repo.DB.Exec(repo.UPDATE_USER_NAME, username, id)
	if err != nil {
		return err
	}
	_, err = res.RowsAffected()
	return err
}

func DupplicatedEmail(email string) (bool, error) {
	var count int
	err := repo.DB.QueryRow(repo.CHECK_EMAIL_DUP, email).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func UpdateEmail(id int, email string) error {
	res, err := repo.DB.Exec(repo.UPDATE_EMAIL, email, id)
	if err != nil {
		return err
	}
	_, err = res.RowsAffected()
	return err

}

func UpdatePassword(id int, password string) error {
	res, err := repo.DB.Exec(repo.UPDATE_PASS, password, id)
	if err != nil {
		return err
	}
	_, err = res.RowsAffected()
	return err
}

func DeleteUser(userId int) error {
	_, err := repo.DB.Exec(repo.DELETE_USER, userId, userId)
	if err != nil {
		return err
	}
	// here i will see it later
	//err = UpdateCatCount()
	//if err != nil {
	//	return err
	//	}
	return nil
}

func GetUserNameById(userId int) (string, error) {
	var userName string
	err := repo.DB.QueryRow(repo.SELECT_USERNAME_BY_ID, userId).Scan(&userName)
	if err != nil {
		return userName, err
	}
	return userName, nil
}

func IsUpdateAllowed(userId int) (bool, error) {
	now := time.Now().UTC()
	var created, updated time.Time // uint int *time.Location == nil utc
	err := repo.DB.QueryRow(repo.SELECT_TIME, userId).Scan(&created, &updated)
	if err != nil {
		return false, err
	}
	diff := now.Sub(updated)
	if diff < (time.Hour*72) && created != updated {
		return false, nil
	}
	return true, nil
}
