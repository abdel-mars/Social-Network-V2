ALTER TABLE posts ADD COLUMN privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'almost_private', 'private'));

CREATE TABLE IF NOT EXISTS post_viewers (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
