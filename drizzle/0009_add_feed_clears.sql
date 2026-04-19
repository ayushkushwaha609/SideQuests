DO $$ BEGIN
  CREATE TYPE feed_type AS ENUM ('friends', 'public');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "feed_clears" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "feed_type" feed_type NOT NULL,
  "cleared_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "feed_clears_user_feed_unique" ON "feed_clears" ("user_id", "feed_type");
