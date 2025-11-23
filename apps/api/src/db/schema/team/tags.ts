import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const teamTags = sqliteTable("team_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color"), // hex形式 例: "#3B82F6"
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(), // 作成者
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const teamTaggings = sqliteTable("team_taggings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => teamTags.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // 'memo' | 'task' | 'board'
  targetOriginalId: text("target_original_id").notNull(), // Phase 6で削除予定
  targetDisplayId: text("target_display_id"), // チーム連番ID
  teamId: integer("team_id").notNull(), // パフォーマンス向上のため重複保存
  userId: text("user_id").notNull(), // 作成者
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type TeamTag = typeof teamTags.$inferSelect;
export type NewTeamTag = typeof teamTags.$inferInsert;
export type TeamTagging = typeof teamTaggings.$inferSelect;
export type NewTeamTagging = typeof teamTaggings.$inferInsert;
