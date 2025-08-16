import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(),
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // "todo", "in_progress", "completed"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  dueDate: integer("due_date"), // Unix timestamp
  categoryId: integer("category_id"),
  boardCategoryId: integer("board_category_id"), // ボードカテゴリーID
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const deletedTasks = sqliteTable("deleted_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  originalId: text("original_id").notNull(), // 元のtasksテーブルのoriginalId
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  dueDate: integer("due_date"),
  categoryId: integer("category_id"),
  boardCategoryId: integer("board_category_id"), // ボードカテゴリーID
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at").notNull(), // 削除日時
});