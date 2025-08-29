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

// 管理者用：特定ユーザーのプラン変更ルート定義
export const updateSpecificUserPlanRoute = createRoute({
  method: "patch",
  path: "/:userId/plan",
  request: {
    params: z.object({
      userId: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.any(), // 一時的に緩和
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
    403: {
      description: "管理者権限が必要です",
    },
  },
  tags: ["Users"],
});

// 特定ユーザー情報取得ルート定義（管理者用）
export const getSpecificUserInfoRoute = createRoute({
  method: "get",
  path: "/:userId",
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
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
    403: {
      description: "管理者権限が必要です",  
    },
    404: {
      description: "ユーザーが見つかりません",
    },
  },
  tags: ["Users"],
});

// Refine用ユーザー一覧取得ルート定義
export const getUsersListRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      _start: z.string().optional(),
      _end: z.string().optional(),
      _sort: z.string().optional(),
      _order: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "ユーザー一覧取得成功",
      content: {
        "application/json": {
          schema: z.array(z.object({
            userId: z.string(),
            planType: z.enum(["free", "premium"]),
            createdAt: z.number(),
          })),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
    403: {
      description: "管理者権限が必要です",
    },
  },
  tags: ["Users"],
});

// ユーザー一覧取得の実装（Refine用）
export async function getUsersList(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  // 管理者権限チェック
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  if (!adminIds.includes(auth.userId)) {
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db: DatabaseType = c.env.db;
  const { _start, _end, _sort, _order } = c.req.query();

  try {
    let query = db.select().from(users);

    // ソート
    if (_sort === 'createdAt') {
      query = _order === 'DESC' ? query.orderBy(desc(users.createdAt)) : query.orderBy(asc(users.createdAt));
    }

    // ページネーション
    if (_start && _end) {
      const start = parseInt(_start);
      const end = parseInt(_end);
      query = query.limit(end - start).offset(start);
    }

    const usersList = await query;
    
    // Refineが期待する形式で返す
    return c.json(usersList.map(user => ({
      userId: user.userId,
      planType: user.planType,
      createdAt: user.createdAt,
    })));

  } catch (error) {
    console.error("ユーザー一覧取得エラー:", error);
    return c.json({ error: "ユーザー一覧の取得に失敗しました" }, 500);
  }
}

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

// 管理者用：特定ユーザー情報取得
export async function getSpecificUserInfo(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  // 管理者権限チェック
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  if (!adminIds.includes(auth.userId)) {
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db: DatabaseType = c.env.db;
  const targetUserId = c.req.param('userId');

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, targetUserId))
      .limit(1);
    
    if (userResult.length === 0) {
      return c.json({ error: "ユーザーが見つかりません" }, 404);
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

// 管理者用：特定ユーザーのプラン変更
export async function updateSpecificUserPlan(c: any) {
  console.log("updateSpecificUserPlan が呼び出されました");
  const auth = getAuth(c);
  if (!auth?.userId) {
    console.log("認証エラー: userIdが未設定");
    return c.json({ error: "認証が必要です" }, 401);
  }

  // 管理者権限チェック
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  console.log("管理者権限チェック:", { userId: auth.userId, adminIds });
  if (!adminIds.includes(auth.userId)) {
    console.log("管理者権限なし:", auth.userId);
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db: DatabaseType = c.env.db;
  const targetUserId = c.req.param('userId');
  
  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    console.log("JSON解析エラー:", error);
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }
  
  console.log("プラン変更リクエスト:", { 
    adminUser: auth.userId, 
    targetUserId, 
    body 
  });

  try {
    const { planType } = body;
    
    if (!planType) {
      console.log("planTypeが未設定:", body);
      return c.json({ error: "planTypeが必要です" }, 400);
    }
    
    if (!['free', 'premium'].includes(planType)) {
      console.log("無効なplanType:", planType);
      return c.json({ error: "planTypeは'free'または'premium'である必要があります" }, 400);
    }
    
    if (!planType) {
      console.log("planType未指定:", body);
      return c.json({ error: "planTypeが必要です" }, 400);
    }
    
    if (!['free', 'premium'].includes(planType)) {
      console.log("無効なplanType:", planType);
      return c.json({ error: "planTypeは'free'または'premium'である必要があります" }, 400);
    }
    
    const now = Math.floor(Date.now() / 1000);

    // 対象ユーザーの存在確認
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, targetUserId))
      .limit(1);

    if (existingUser.length > 0) {
      // 既存ユーザーの更新
      await db
        .update(users)
        .set({
          planType,
          updatedAt: now,
        })
        .where(eq(users.userId, targetUserId));
    } else {
      // 新規ユーザーの作成
      await db.insert(users).values({
        userId: targetUserId,
        planType,
        createdAt: now,
        updatedAt: now,
      });
    }

    return c.json({
      message: `ユーザー ${targetUserId} のプランを${planType}に変更しました`,
      userId: targetUserId,
      planType,
    }, 200);

  } catch (error) {
    console.error("プラン変更エラー:", error);
    return c.json({ error: "プラン変更に失敗しました" }, 500);
  }
}