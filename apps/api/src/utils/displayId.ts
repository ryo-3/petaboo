import { teamTasks } from "../db/schema/team/tasks";
import { teamMemos } from "../db/schema/team/memos";
import { eq, sql } from "drizzle-orm";
import type { DB } from "../lib/db-d1";

/**
 * チームタスク用のdisplayIdを生成
 * @param db データベース接続
 * @param teamId チームID
 * @returns displayId（例: "1", "2", "3"）
 */
export async function generateTaskDisplayId(
  db: DB,
  teamId: number,
): Promise<string> {
  // タスクのみの最大シーケンス番号を取得
  const maxTask = await db
    .select({
      max: sql<number | null>`MAX(CAST(display_id AS INTEGER))`,
    })
    .from(teamTasks)
    .where(eq(teamTasks.teamId, teamId))
    .get();

  const nextSeq = (maxTask?.max || 0) + 1;
  return nextSeq.toString();
}

/**
 * チームメモ用のdisplayIdを生成
 * @param db データベース接続
 * @param teamId チームID
 * @returns displayId（例: "1", "2", "3"）
 */
export async function generateMemoDisplayId(
  db: DB,
  teamId: number,
): Promise<string> {
  // メモのみの最大シーケンス番号を取得
  const maxMemo = await db
    .select({
      max: sql<number | null>`MAX(CAST(display_id AS INTEGER))`,
    })
    .from(teamMemos)
    .where(eq(teamMemos.teamId, teamId))
    .get();

  const nextSeq = (maxMemo?.max || 0) + 1;
  return nextSeq.toString();
}

/**
 * displayIdをパース
 */
export function parseDisplayId(displayId: string): {
  sequence: number;
} | null {
  const sequence = parseInt(displayId, 10);
  if (isNaN(sequence) || sequence <= 0) return null;

  return { sequence };
}

/**
 * displayIdの妥当性チェック
 */
export function isValidDisplayId(displayId: string): boolean {
  return /^\d+$/.test(displayId);
}
