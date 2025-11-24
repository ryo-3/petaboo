import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teamNotifications = sqliteTable("team_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(), // 通知を受け取るユーザー
  type: text("type").notNull(), // "mention" | "team_request" など
  sourceType: text("source_type"), // "comment" | "memo" | "task" など
  sourceId: integer("source_id"), // コメントIDなど
  targetType: text("target_type"), // "memo" | "task" | "board"
  targetDisplayId: text("target_display_id"), // 対象のdisplayId
  boardDisplayId: text("board_display_id"), // ボードのdisplayId
  actorUserId: text("actor_user_id"), // アクションを起こしたユーザー
  message: text("message"), // 通知メッセージ
  isRead: integer("is_read").notNull().default(0), // 0: 未読, 1: 既読
  createdAt: integer("created_at").notNull(),
  readAt: integer("read_at"),
});
