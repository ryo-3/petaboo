import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const teamBoardCategories = sqliteTable("team_board_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  boardId: integer("board_id").notNull(), // チームボード専用カテゴリー
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(), // 作成者
  icon: text("icon"), // アイコン名 例: "folder", "project"
  sortOrder: integer("sort_order").notNull().default(0), // 表示順序
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export type TeamBoardCategory = typeof teamBoardCategories.$inferSelect;
export type NewTeamBoardCategory = typeof teamBoardCategories.$inferInsert;