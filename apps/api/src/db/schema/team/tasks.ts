import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teamTasks = sqliteTable("team_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  displayId: text("display_id").notNull(), // チーム連番ID（例: "1", "2", "3"）
  uuid: text("uuid"), // 将来用UUID（オプショナル）
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // "todo", "in_progress", "completed"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  dueDate: integer("due_date"), // Unix timestamp
  categoryId: integer("category_id"),
  boardCategoryId: integer("board_category_id"), // ボードカテゴリーID
  assigneeId: text("assignee_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
  deletedAt: integer("deleted_at"), // 論理削除用
});

// チームタスクステータス変更履歴テーブル
export const teamTaskStatusHistory = sqliteTable("team_task_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(), // 変更したユーザー
  fromStatus: text("from_status"), // 変更前（作成時はNULL）
  toStatus: text("to_status").notNull(), // 変更後
  changedAt: integer("changed_at").notNull(), // Unix timestamp
});
