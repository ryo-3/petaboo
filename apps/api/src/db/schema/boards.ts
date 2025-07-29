import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { boardCategories } from "./board-categories";

export const boards = sqliteTable("boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  userId: text("user_id").notNull(),
  boardCategoryId: integer("board_category_id").references(() => boardCategories.id, { onDelete: "set null" }),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export const boardItems = sqliteTable("board_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'memo' | 'task'
  originalId: text("original_id").notNull(), // メモ/タスクのoriginalId
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const deletedBoards = sqliteTable("deleted_boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  originalId: integer("original_id").notNull(), // 元のboardsテーブルのID
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  boardCategoryId: integer("board_category_id"), // 削除時にカテゴリー情報も保存
  archived: integer("archived", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;
export type BoardItem = typeof boardItems.$inferSelect;
export type NewBoardItem = typeof boardItems.$inferInsert;
export type DeletedBoard = typeof deletedBoards.$inferSelect;
export type NewDeletedBoard = typeof deletedBoards.$inferInsert;