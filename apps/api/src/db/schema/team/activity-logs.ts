import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

/**
 * チームアクティビティログテーブル
 * チーム内のユーザーアクションを記録（メモ作成、タスク完了、コメント投稿など）
 */
export const teamActivityLogs = sqliteTable("team_activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(), // チームID
  userId: text("user_id").notNull(), // 実行ユーザーのClerk ID
  actionType: text("action_type").notNull(), // アクション種別（memo_created, task_completed等）
  targetType: text("target_type").notNull(), // 対象タイプ（memo, task, comment等）
  targetId: text("target_id"), // 対象のID（originalId等）
  targetTitle: text("target_title"), // 対象のタイトル（表示用）
  metadata: text("metadata"), // 追加情報（JSON文字列）
  createdAt: integer("created_at").notNull(), // アクション実行日時
});

/**
 * アクション種別の定義
 *
 * メモ関連:
 * - memo_created: メモ作成
 * - memo_updated: メモ更新
 * - memo_deleted: メモ削除
 *
 * タスク関連:
 * - task_created: タスク作成
 * - task_updated: タスク更新
 * - task_status_changed: タスクステータス変更
 * - task_deleted: タスク削除
 *
 * コメント関連:
 * - comment_created: コメント作成
 * - comment_deleted: コメント削除
 *
 * ボード関連:
 * - board_item_added: ボードアイテム追加
 * - board_item_removed: ボードアイテム削除
 *
 * メンバー関連:
 * - member_joined: メンバー参加
 * - member_left: メンバー退出
 */
