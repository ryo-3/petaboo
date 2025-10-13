import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teamSlackConfigs = sqliteTable("team_slack_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull().unique(), // 1チーム1設定のみ
  webhookUrl: text("webhook_url").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
