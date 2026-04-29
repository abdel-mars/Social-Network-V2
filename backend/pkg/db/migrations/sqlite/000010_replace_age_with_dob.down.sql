-- Revert replace age with date_of_birth
CREATE TABLE users_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    age INTEGER,
    gender TEXT,
    nickname TEXT,   
    about TEXT,               
    avatar TEXT,
    cover TEXT,
    is_private BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_old (id, username, email, password_hash, first_name, last_name, gender, nickname, about, avatar, cover, is_private, created_at, updated_at)
SELECT id, username, email, password_hash, first_name, last_name, gender, nickname, about, avatar, cover, is_private, created_at, updated_at FROM users;

DROP TABLE users;
ALTER TABLE users_old RENAME TO users;
