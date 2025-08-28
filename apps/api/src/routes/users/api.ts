import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq } from "drizzle-orm";
import { users } from "../../db";
import type { DatabaseType } from "../../types/common";

// ユーザー情報取得ルート定義
export const getUserInfoRoute = createRoute({
  method: "get",
  path: "/me",
  responses: {
    200: {
      description: "ユーザー情報取得成功",
      content: {
        "application/json": {
          schema: z.object({
            userId: z.string(),
            planType: z.enum(["free", "premium"]),
            createdAt: z.number(),
          }),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Users"],
});

// ユーザー情報取得の実装
export async function getUserInfo(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // ユーザー情報を取得または作成
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);
    
    if (userResult.length === 0) {
      // ユーザーが存在しない場合は作成（既存ユーザー対応）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: 'free',
        createdAt: now,
        updatedAt: now,
      });
      
      // 新しく作成したユーザー情報を返す
      return c.json({
        userId: auth.userId,
        planType: 'free',
        createdAt: now,
      }, 200);
    }

    const user = userResult[0];
    return c.json({
      userId: user.userId,
      planType: user.planType,
      createdAt: user.createdAt,
    }, 200);

  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
    return c.json({ error: "ユーザー情報の取得に失敗しました" }, 500);
  }
}