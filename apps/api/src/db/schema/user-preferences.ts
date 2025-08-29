import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const userPreferences = sqliteTable("user_preferences", {
  userId: integer("user_id").primaryKey(),
  memoColumnCount: integer("memo_column_count").default(4).notNull(),
  taskColumnCount: integer("task_column_count").default(2).notNull(),
  memoViewMode: text("memo_view_mode", { enum: ["card", "list"] })
    .default("list")
    .notNull(),
  taskViewMode: text("task_view_mode", { enum: ["card", "list"] })
    .default("list")
    .notNull(),
  memoHideControls: integer("memo_hide_controls", { mode: "boolean" })
    .default(false)
    .notNull(),
  taskHideControls: integer("task_hide_controls", { mode: "boolean" })
    .default(false)
    .notNull(),
  hideHeader: integer("hide_header", { mode: "boolean" })
    .default(false)
    .notNull(),
  createdAt: real("created_at").default(Date.now()).notNull(),
  updatedAt: real("updated_at").default(Date.now()).notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
