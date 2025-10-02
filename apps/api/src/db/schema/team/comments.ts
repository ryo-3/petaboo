import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teamComments = sqliteTable("team_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  targetType: text("target_type").notNull(), // "memo" | "task" | "board"
  targetOriginalId: text("target_original_id").notNull(), // 対象のoriginalId
  content: text("content").notNull(),
  mentions: text("mentions"), // JSON配列: メンションされたuserIdのリスト ["user_xxx", "user_yyy"]
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});
