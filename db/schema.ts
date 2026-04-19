import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  boolean,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// Enums
export const recurrenceEnum = pgEnum("recurrence", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "lifetime",
  "one-time",
]);

export const visibilityEnum = pgEnum("visibility", [
  "public",
  "friends",
  "private",
]);

export const questStatusEnum = pgEnum("quest_status", [
  "active",
  "completed",
  "archived",
]);

export const memberRoleEnum = pgEnum("member_role", ["owner", "member"]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "declined",
]);

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "accepted",
]);

export const achievementTypeEnum = pgEnum("achievement_type", [
  "first_quest",
  "streak_7",
  "streak_30",
  "quests_10",
  "quests_50",
  "quests_100",
  "first_friend",
  "first_shared",
  "level_5",
  "level_10",
]);

export const questArtifactTypeEnum = pgEnum("quest_artifact_type", [
  "comment",
  "completion",
  "proof",
  "upload",
  "chat",
]);

// Users table (synced from Clerk via webhook)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  profileImages: jsonb("profile_images").$type<string[]>().default([]).notNull(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakCount: integer("streak_count").notNull().default(0),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sidequests table
export const sidequests = pgTable("sidequests", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  recurrence: recurrenceEnum("recurrence").notNull().default("one-time"),
  dueDate: timestamp("due_date"),
  status: questStatusEnum("status").notNull().default("active"),
  xpReward: integer("xp_reward").notNull().default(10),
  visibility: visibilityEnum("visibility").notNull().default("friends"),
  coverEmoji: text("cover_emoji").default("⚔️"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quest members (for shared quests)
export const questMembers = pgTable("quest_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id")
    .notNull()
    .references(() => sidequests.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("member"),
  inviteStatus: inviteStatusEnum("invite_status").notNull().default("pending"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Quest completions
export const questCompletions = pgTable("quest_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id")
    .notNull()
    .references(() => sidequests.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  note: text("note"),
  imageUrl: text("image_url"),
});

// Friendships
export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  friendId: uuid("friend_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: friendshipStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Achievements
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: achievementTypeEnum("type").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// Activity feed entries
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "quest_completed", "achievement_earned", "friend_joined"
  questId: uuid("quest_id").references(() => sidequests.id, {
    onDelete: "set null",
  }),
  achievementType: achievementTypeEnum("achievement_type"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments on quests (visible in feed and quest detail)
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id")
    .notNull()
    .references(() => sidequests.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// Quest artifacts (timeline of contributions)
export const questArtifacts = pgTable("quest_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: uuid("quest_id")
    .notNull()
    .references(() => sidequests.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: questArtifactTypeEnum("type").notNull(),
  sourceId: uuid("source_id"),
  summary: text("summary"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Direct Messages
export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: text("chat_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  imageUrl: text("image_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
import { relations } from "drizzle-orm";

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  user: one(users, {
    fields: [directMessages.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Sidequest = typeof sidequests.$inferSelect;
export type NewSidequest = typeof sidequests.$inferInsert;
export type QuestMember = typeof questMembers.$inferSelect;
export type QuestCompletion = typeof questCompletions.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type QuestArtifact = typeof questArtifacts.$inferSelect;
