import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  displayId: text("display_id").notNull(),
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
  deletedAt: integer("deleted_at"), // 論理削除用
});

// ステータス変更履歴テーブル
export const taskStatusHistory = sqliteTable("task_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  userId: text("user_id").notNull(),
  fromStatus: text("from_status"), // 変更前（作成時はNULL）
  toStatus: text("to_status").notNull(), // 変更後
  changedAt: integer("changed_at").notNull(), // Unix timestamp
});
