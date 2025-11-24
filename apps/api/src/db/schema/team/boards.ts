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
  boardCategoryId: integer("board_category_id").references(
    () => teamBoardCategories.id,
    { onDelete: "set null" },
  ),
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
  boardId: integer("board_id")
    .notNull()
    .references(() => teamBoards.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'memo' | 'task'
  displayId: text("display_id").notNull(), // チーム連番ID
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type TeamBoard = typeof teamBoards.$inferSelect;
export type NewTeamBoard = typeof teamBoards.$inferInsert;
export type TeamBoardItem = typeof teamBoardItems.$inferSelect;
export type NewTeamBoardItem = typeof teamBoardItems.$inferInsert;
