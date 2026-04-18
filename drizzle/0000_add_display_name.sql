-- Add display_name column for users.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS display_name text;
