import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const deletedNotes = sqliteTable("deleted_notes", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(), // 元のnotesテーブルのoriginalId
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});
