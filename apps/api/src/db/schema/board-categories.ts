import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const boardCategories = sqliteTable("board_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  boardId: integer("board_id").notNull(), // ボード専用カテゴリー
  icon: text("icon"), // アイコン名 例: "folder", "project"
  sortOrder: integer("sort_order").notNull().default(0), // 表示順序
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export type BoardCategory = typeof boardCategories.$inferSelect;
export type NewBoardCategory = typeof boardCategories.$inferInsert;
