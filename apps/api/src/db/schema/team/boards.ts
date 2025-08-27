import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { teamBoardCategories } from "./board-categories";

export const teamBoards = sqliteTable("team_boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(), // 作成者
  boardCategoryId: integer("board_category_id").references(() => teamBoardCategories.id, { onDelete: "set null" }),
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

export const teamBoardItems = sqliteTable("team_board_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id").notNull().references(() => teamBoards.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'memo' | 'task'
  originalId: text("original_id").notNull(), // チームメモ/タスクのoriginalId
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const teamDeletedBoards = sqliteTable("team_deleted_boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  originalId: integer("original_id").notNull(), // 元のteam_boardsテーブルのID
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  boardCategoryId: integer("board_category_id"), // 削除時にカテゴリー情報も保存
  archived: integer("archived", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});

export type TeamBoard = typeof teamBoards.$inferSelect;
export type NewTeamBoard = typeof teamBoards.$inferInsert;
export type TeamBoardItem = typeof teamBoardItems.$inferSelect;
export type NewTeamBoardItem = typeof teamBoardItems.$inferInsert;
export type TeamDeletedBoard = typeof teamDeletedBoards.$inferSelect;
export type NewTeamDeletedBoard = typeof teamDeletedBoards.$inferInsert;