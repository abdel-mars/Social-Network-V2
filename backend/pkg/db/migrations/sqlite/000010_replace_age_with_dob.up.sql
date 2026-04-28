-- Migration to replace age with date_of_birth in users table
-- We'll create a new table, copy data, and rename it to handle the column change safely in SQLite

CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    date_of_birth TEXT, -- Replaces age
    gender TEXT,
    nickname TEXT,   
    about TEXT,               
    avatar TEXT,
    cover TEXT,
    is_private BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data (age will be lost or we can try to store it as a string if needed, 
-- but better to just start fresh with DOB as per requirements)
INSERT INTO users_new (id, username, email, password_hash, first_name, last_name, gender, nickname, about, avatar, cover, is_private, created_at, updated_at)
SELECT id, username, email, password_hash, first_name, last_name, gender, nickname, about, avatar, cover, is_private, created_at, updated_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
