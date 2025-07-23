import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const memos = sqliteTable("memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const deletedMemos = sqliteTable("deleted_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(), // 元のmemosテーブルのoriginalId
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});
