import type { D1Database } from "@cloudflare/workers-types";

interface ConflictCheckResult {
  conflict: boolean;
  reason?: "not_found" | "outdated";
  currentUpdatedAt?: number;
}

/**
 * 楽観的ロックによる競合チェック
 * @param db - D1データベース
 * @param tableName - テーブル名（team_tasks, team_memos）
 * @param id - アイテムID
 * @param clientUpdatedAt - クライアントが持つ updatedAt
 * @returns 競合チェック結果
 */
export const checkConflict = async (
  db: D1Database,
  tableName: string,
  id: number,
  clientUpdatedAt: number | null | undefined,
): Promise<ConflictCheckResult> => {
  // updatedAt が送信されていない場合はチェックスキップ（後方互換性）
  if (clientUpdatedAt === null || clientUpdatedAt === undefined) {
    return { conflict: false };
  }

  const current = await db
    .prepare(`SELECT updatedAt FROM ${tableName} WHERE id = ?`)
    .bind(id)
    .first<{ updatedAt: number | null }>();

  if (!current) {
    return { conflict: true, reason: "not_found" };
  }

  // DB の updatedAt とクライアントの updatedAt を比較
  if (current.updatedAt !== clientUpdatedAt) {
    return {
      conflict: true,
      reason: "outdated",
      currentUpdatedAt: current.updatedAt ?? undefined,
    };
  }

  return { conflict: false };
};
