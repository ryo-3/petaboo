import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const memos = sqliteTable("memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  displayId: text("display_id").notNull(),
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at"), // 論理削除用
});

export const deletedMemos = sqliteTable("deleted_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  displayId: text("display_id").notNull(),
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});
