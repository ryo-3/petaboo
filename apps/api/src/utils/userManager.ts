// apps/api/src/utils/userManager.ts
import { eq } from "drizzle-orm";
import { users } from "../db";
import type { DatabaseType } from "../types/common";

/**
 * 認証済みユーザーがusersテーブルに存在するかチェックし、
 * 存在しない場合は自動で作成する
 */
export async function ensureUserExists(
  db: DatabaseType,
  userId: string,
): Promise<void> {
  try {
    // ユーザーが既に存在するかチェック
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (existingUser.length === 0) {
      // ユーザーが存在しない場合は作成
      const now = Math.floor(Date.now() / 1000);

      await db.insert(users).values({
        userId,
        planType: "free", // デフォルトは無料プラン
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    // エラーが発生してもAPI処理は続行（ログのみ）
    console.error("ユーザー自動作成エラー:", error);
  }
}
