CREATE INDEX IF NOT EXISTS "quest_artifacts_quest_id_type_idx" ON "quest_artifacts" ("quest_id", "type");
CREATE INDEX IF NOT EXISTS "quest_artifacts_quest_id_user_id_idx" ON "quest_artifacts" ("quest_id", "user_id");
