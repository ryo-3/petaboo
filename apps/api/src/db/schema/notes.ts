import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: integer("created_at").notNull(),
});

export const deletedNotes = sqliteTable("deleted_notes", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull(),
  originalId: integer("original_id").notNull(), // 元のnotesテーブルのID
  title: text("title").notNull(),
  content: text("content"),
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});
