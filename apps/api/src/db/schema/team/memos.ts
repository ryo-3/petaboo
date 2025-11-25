import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teamMemos = sqliteTable("team_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  displayId: text("display_id").notNull(), // チーム連番ID（例: "1", "2", "3"）
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at"), // 論理削除用
});

export const teamDeletedMemos = sqliteTable("team_deleted_memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  displayId: text("display_id").notNull(), // チーム連番ID
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  content: text("content"),
  categoryId: integer("category_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});
