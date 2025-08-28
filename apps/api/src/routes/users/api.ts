import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, desc, asc } from "drizzle-orm";
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

// プラン変更ルート定義（開発・管理者用）
export const updateUserPlanRoute = createRoute({
  method: "patch",
  path: "/plan",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            planType: z.enum(["free", "premium"]),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "プラン変更成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            userId: z.string(),
            planType: z.enum(["free", "premium"]),
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

// プラン変更の実装（開発・管理者用）
export async function updateUserPlan(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;
  const body = await c.req.json();

  try {
    const { planType } = body;
    const now = Math.floor(Date.now() / 1000);

    // ユーザー情報をupsert
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);

    if (existingUser.length > 0) {
      // 既存ユーザーの更新
      await db
        .update(users)
        .set({
          planType,
          updatedAt: now,
        })
        .where(eq(users.userId, auth.userId));
    } else {
      // 新規ユーザーの作成
      await db.insert(users).values({
        userId: auth.userId,
        planType,
        createdAt: now,
        updatedAt: now,
      });
    }

    return c.json({
      message: `プランを${planType}に変更しました`,
      userId: auth.userId,
      planType,
    }, 200);

  } catch (error) {
    console.error("プラン変更エラー:", error);
    return c.json({ error: "プラン変更に失敗しました" }, 500);
  }
}