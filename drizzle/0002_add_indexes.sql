-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS friendships_user_status_idx ON friendships (user_id, status);
CREATE INDEX IF NOT EXISTS friendships_friend_status_idx ON friendships (friend_id, status);

CREATE INDEX IF NOT EXISTS activities_user_created_at_idx ON activities (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS comments_quest_created_at_idx ON comments (quest_id, created_at DESC);

CREATE INDEX IF NOT EXISTS quest_completions_user_quest_created_at_idx ON quest_completions (user_id, quest_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS direct_messages_chat_created_at_idx ON direct_messages (chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sidequests_created_by_created_at_idx ON sidequests (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS sidequests_visibility_status_created_at_idx ON sidequests (visibility, status, created_at DESC);
