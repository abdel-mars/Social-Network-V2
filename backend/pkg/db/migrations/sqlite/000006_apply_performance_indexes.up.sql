CREATE INDEX IF NOT EXISTS idx_followers_followed ON followers(followed_id, status);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_lookup ON notifications(user_id, state, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read, sender_id);
