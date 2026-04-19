CREATE TYPE quest_artifact_type AS ENUM (
  'comment',
  'completion',
  'upload',
  'chat',
  'checklist'
);

CREATE TABLE "quest_artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "quest_id" uuid NOT NULL REFERENCES "sidequests"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" quest_artifact_type NOT NULL,
  "source_id" uuid,
  "summary" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "quest_artifacts_quest_id_created_at_idx" ON "quest_artifacts" ("quest_id", "created_at" DESC);
