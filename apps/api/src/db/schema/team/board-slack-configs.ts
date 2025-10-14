import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const boardSlackConfigs = sqliteTable("board_slack_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id").notNull().unique(), // 1ボード1設定のみ
  webhookUrl: text("webhook_url").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
