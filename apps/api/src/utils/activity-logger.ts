import { teamActivityLogs } from "../db";

/**
 * アクティビティログタイプ定義
 */
export type ActivityType =
  // メモ関連
  | "memo_created"
  | "memo_updated"
  | "memo_deleted"
  // タスク関連
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_deleted"
  // コメント関連
  | "comment_created"
  | "comment_deleted"
  // ボード関連
  | "board_item_added"
  | "board_item_removed"
  // メンバー関連
  | "member_joined"
  | "member_left";

export type TargetType = "memo" | "task" | "comment" | "board" | "member";

interface LogActivityParams {
  db: any;
  teamId: number;
  userId: string;
  actionType: ActivityType;
  targetType: TargetType;
  targetId?: string;
  targetTitle?: string;
  metadata?: Record<string, any>;
}

/**
 * アクティビティログを記録する共通関数
 */
export async function logActivity({
  db,
  teamId,
  userId,
  actionType,
  targetType,
  targetId,
  targetTitle,
  metadata,
}: LogActivityParams): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);

    await db.insert(teamActivityLogs).values({
      teamId,
      userId,
      actionType,
      targetType,
      targetId: targetId || null,
      targetTitle: targetTitle || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: now,
    });
  } catch (error) {
    // ログ記録失敗は処理を止めない（エラーログ出力のみ）
    console.error("アクティビティログ記録エラー:", error);
  }
}
