import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teamMemos = sqliteTable("team_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const teamDeletedMemos = sqliteTable("team_deleted_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(), // 元のteam_memosテーブルのoriginalId
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});
