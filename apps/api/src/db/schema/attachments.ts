import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

/**
 * 個人用添付ファイル（メモ・タスク用）
 */
export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  attachedTo: text("attached_to", { enum: ["memo", "task"] }).notNull(),
  attachedId: integer("attached_id").notNull(), // memo/task の id
  displayId: text("display_id").notNull(), // 削除・復元追跡用（メモ/タスクのdisplayId）
  fileName: text("file_name").notNull(), // 元ファイル名
  fileSize: integer("file_size").notNull(), // バイト数
  mimeType: text("mime_type").notNull(), // image/jpeg, image/png等
  r2Key: text("r2_key").notNull(), // R2上のオブジェクトキー
  url: text("url").notNull(), // アクセス用URL
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at"), // 論理削除
});

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
