import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

/**
 * チーム用添付ファイル（メモ・タスク・コメント用）
 */
export const teamAttachments = sqliteTable("team_attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(), // アップロード者
  attachedTo: text("attached_to", {
    enum: ["memo", "task", "comment"],
  }).notNull(),
  attachedDisplayId: text("attached_display_id").notNull(), // memo/task/comment の displayId
  originalId: text("original_id").notNull(), // この添付ファイル自身の originalId（削除・復元追跡用）
  fileName: text("file_name").notNull(), // 元ファイル名
  fileSize: integer("file_size").notNull(), // バイト数
  mimeType: text("mime_type").notNull(), // image/jpeg, image/png等
  r2Key: text("r2_key").notNull(), // R2上のオブジェクトキー
  url: text("url").notNull(), // アクセス用URL
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at"), // 論理削除
});

export type TeamAttachment = typeof teamAttachments.$inferSelect;
export type NewTeamAttachment = typeof teamAttachments.$inferInsert;
