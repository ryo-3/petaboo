import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color"), // hex形式 例: "#3B82F6"
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const taggings = sqliteTable("taggings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // 'memo' | 'task' | 'board'
  targetOriginalId: text("target_original_id").notNull(), // 対象のoriginalId（移行中、後で削除予定）
  targetDisplayId: text("target_display_id"), // 対象のdisplayId（移行先）
  userId: text("user_id").notNull(), // パフォーマンス向上のため重複保存
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Tagging = typeof taggings.$inferSelect;
export type NewTagging = typeof taggings.$inferInsert;
