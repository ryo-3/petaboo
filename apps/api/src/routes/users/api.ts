import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, desc, asc, sql } from "drizzle-orm";
import { users } from "../../db";

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
            displayName: z.string().nullable(),
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

// 管理者用：標準REST - 個別ユーザー取得
export const getUserRoute = createRoute({
  method: "get",
  path: "/:userId",
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "ユーザー取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            userId: z.string(),
            planType: z.enum(["free", "premium"]),
            premiumStartDate: z.number().nullable(),
            nextBillingDate: z.number().nullable(),
            createdAt: z.number(),
            updatedAt: z.number(),
          }),
        },
      },
    },
    401: { description: "認証が必要です" },
    403: { description: "管理者権限が必要です" },
    404: { description: "ユーザーが見つかりません" },
  },
  tags: ["Users"],
});

// 管理者用：標準REST - ユーザー更新
export const updateUserRoute = createRoute({
  method: "put",
  path: "/:userId",
  request: {
    params: z.object({
      userId: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            planType: z.enum(["free", "premium"]).optional(),
            premiumStartDate: z.number().nullable().optional(),
            nextBillingDate: z.number().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "ユーザー更新成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            userId: z.string(),
            planType: z.enum(["free", "premium"]),
            premiumStartDate: z.number().nullable(),
            nextBillingDate: z.number().nullable(),
            createdAt: z.number(),
            updatedAt: z.number(),
          }),
        },
      },
    },
    401: { description: "認証が必要です" },
    403: { description: "管理者権限が必要です" },
    404: { description: "ユーザーが見つかりません" },
  },
  tags: ["Users"],
});

// 管理者用：特定ユーザーのプラン変更ルート定義（既存互換性維持）
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

// 特定ユーザー情報取得ルート定義（管理者用）- 削除（getUserRouteと重複）

// 表示名更新ルート定義
export const updateDisplayNameRoute = createRoute({
  method: "patch",
  path: "/displayname",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            displayName: z
              .string()
              .min(1, "表示名は必須です")
              .max(50, "表示名は50文字以内で入力してください"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "表示名更新成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            userId: z.string(),
            displayName: z.string(),
          }),
        },
      },
    },
    400: {
      description: "リクエストが不正です",
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Users"],
});

// Refine用個別ユーザー取得ルート定義
export const getUserByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "ユーザー取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            userId: z.string(),
            email: z.string(),
            planType: z.enum(["free", "premium"]),
            createdAt: z.number(),
            updatedAt: z.number().optional(),
            premiumStartDate: z.number().optional(),
            nextBillingDate: z.number().optional(),
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

// ユーザー存在確認・作成ルート定義（ログイン時用）
export const ensureUserExistsRoute = createRoute({
  method: "post",
  path: "/ensure-exists",
  responses: {
    200: {
      description: "ユーザー存在確認・作成成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            userId: z.string(),
            created: z.boolean(),
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
          schema: z.array(
            z.object({
              id: z.string(),
              userId: z.string(),
              email: z.string(),
              planType: z.enum(["free", "premium"]),
              createdAt: z.number(),
            }),
          ),
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

// ユーザー存在確認・作成の実装（ログイン時用）
export async function ensureUserExists(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db = c.get("db");

  try {
    // ユーザーが既に存在するかチェック
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);

    if (existingUser.length > 0) {
      // 既存ユーザー
      return c.json({
        message: "ユーザーは既に存在します",
        userId: auth.userId,
        created: false,
      });
    }

    // 新規ユーザー作成
    const now = Math.floor(Date.now() / 1000);
    await db.insert(users).values({
      userId: auth.userId,
      planType: "free",
      createdAt: now,
      updatedAt: now,
    });

    return c.json({
      message: "新規ユーザーを作成しました",
      userId: auth.userId,
      created: true,
    });
  } catch (error) {
    console.error("ユーザー存在確認・作成エラー:", error);
    return c.json({ error: "ユーザー作成に失敗しました" }, 500);
  }
}

// ユーザー一覧取得の実装（Refine用・開発環境のみ）
export async function getUsersList(c: any) {
  // 管理者権限チェック（トークンベース）
  const adminToken = c.req.header("x-admin-token");
  const validAdminToken = c.env?.ADMIN_TOKEN;
  if (!adminToken || adminToken !== validAdminToken) {
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db = c.get("db");
  const { _start, _end, _sort, _order } = c.req.query();

  try {
    let query = db.select().from(users);

    // ソート
    if (_sort === "createdAt") {
      query =
        _order === "DESC"
          ? query.orderBy(desc(users.createdAt))
          : query.orderBy(asc(users.createdAt));
    }

    // ページネーション
    if (_start && _end) {
      const start = parseInt(_start);
      const end = parseInt(_end);
      query = query.limit(end - start).offset(start);
    }

    const usersList = await query;

    // Clerk Backend APIを使ってメール情報を取得
    const clerkSecretKey = c.env?.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return c.json({ error: "Clerk設定が見つかりません" }, 500);
    }

    const usersWithEmail = await Promise.all(
      usersList.map(async (user: any) => {
        try {
          // Clerk Backend API直接呼び出し
          const response = await fetch(
            `https://api.clerk.com/v1/users/${user.userId}`,
            {
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (response.ok) {
            const clerkUser = await response.json();
            const primaryEmail = clerkUser.email_addresses?.find(
              (email: any) => email.id === clerkUser.primary_email_address_id,
            );

            return {
              id: user.userId, // Refineはデフォルトでidフィールドを期待する
              userId: user.userId,
              email: primaryEmail?.email_address || "メール不明",
              planType: user.planType,
              createdAt: user.createdAt,
            };
          } else {
            console.error(
              `Clerkユーザー取得失敗 (${user.userId}):`,
              response.status,
            );
            return {
              id: user.userId,
              userId: user.userId,
              email: "取得失敗",
              planType: user.planType,
              createdAt: user.createdAt,
            };
          }
        } catch (error) {
          console.error(`Clerkユーザー取得エラー (${user.userId}):`, error);
          return {
            id: user.userId,
            userId: user.userId,
            email: "取得エラー",
            planType: user.planType,
            createdAt: user.createdAt,
          };
        }
      }),
    );

    // 総数を取得（ページネーション用）
    const totalCountResult = await db
      .select({ count: sql`count(*)` })
      .from(users);
    const total = totalCountResult[0]?.count || 0;

    // Refineが期待するX-Total-Countヘッダーを設定
    const response = c.json(usersWithEmail);
    response.headers.set("X-Total-Count", total.toString());
    return response;
  } catch (error) {
    console.error("ユーザー一覧取得エラー:", error);
    return c.json({ error: "ユーザー一覧の取得に失敗しました" }, 500);
  }
}

// 個別ユーザー取得の実装（Refine用・開発環境のみ）
export async function getUserById(c: any) {
  // 管理者権限チェック（トークンベース）
  const adminToken = c.req.header("x-admin-token");
  const validAdminToken = c.env?.ADMIN_TOKEN;
  if (!adminToken || adminToken !== validAdminToken) {
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db = c.get("db");
  const { id } = c.req.param();

  try {
    // データベースからユーザーを取得
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, id))
      .limit(1);

    if (userResult.length === 0) {
      return c.json({ error: "ユーザーが見つかりません" }, 404);
    }

    const user = userResult[0];

    // Clerk Backend APIを使ってメール情報を取得
    const clerkSecretKey = c.env?.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return c.json({ error: "Clerk設定が見つかりません" }, 500);
    }

    try {
      const response = await fetch(
        `https://api.clerk.com/v1/users/${user.userId}`,
        {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const clerkUser = await response.json();
        const primaryEmail = clerkUser.email_addresses?.find(
          (email: any) => email.id === clerkUser.primary_email_address_id,
        );

        return c.json({
          id: user.userId, // Refineはデフォルトでidフィールドを期待する
          userId: user.userId,
          email: primaryEmail?.email_address || "メール不明",
          planType: user.planType,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          premiumStartDate: user.premiumStartDate,
          nextBillingDate: user.nextBillingDate,
        });
      } else {
        console.error(
          `Clerkユーザー取得失敗 (${user.userId}):`,
          response.status,
        );
        return c.json({
          id: user.userId,
          userId: user.userId,
          email: "取得失敗",
          planType: user.planType,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          premiumStartDate: user.premiumStartDate,
          nextBillingDate: user.nextBillingDate,
        });
      }
    } catch (clerkError) {
      console.error(`Clerkユーザー取得エラー (${user.userId}):`, clerkError);
      return c.json({
        id: user.userId,
        userId: user.userId,
        email: "取得エラー",
        planType: user.planType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        premiumStartDate: user.premiumStartDate,
        nextBillingDate: user.nextBillingDate,
      });
    }
  } catch (error) {
    console.error("個別ユーザー取得エラー:", error);
    return c.json({ error: "ユーザーの取得に失敗しました" }, 500);
  }
}

// ユーザー情報取得の実装
export async function getUserInfo(c: any) {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db = c.get("db");

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
        planType: "free",
        createdAt: now,
        updatedAt: now,
      });

      // 新しく作成したユーザー情報を返す
      return c.json(
        {
          userId: auth.userId,
          displayName: null,
          planType: "free",
          createdAt: now,
        },
        200,
      );
    }

    const user = userResult[0];
    return c.json(
      {
        userId: user.userId,
        displayName: user.displayName,
        planType: user.planType,
        createdAt: user.createdAt,
      },
      200,
    );
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

  const db = c.get("db");
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

    return c.json(
      {
        message: `プランを${planType}に変更しました`,
        userId: auth.userId,
        planType,
      },
      200,
    );
  } catch (error) {
    console.error("プラン変更エラー:", error);
    return c.json({ error: "プラン変更に失敗しました" }, 500);
  }
}

// 管理者用：特定ユーザー情報取得（標準REST対応）- 削除（getUserと重複）

// 管理者用：標準REST - 個別ユーザー取得
export async function getUser(c: any) {
  // 管理者権限チェック（トークンベース）
  const adminToken = c.req.header("x-admin-token");
  const validAdminToken = c.env?.ADMIN_TOKEN;
  if (!adminToken || adminToken !== validAdminToken) {
    // 管理者トークンがない場合は通常のClerk認証
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db = c.get("db");
  const targetUserId = c.req.param("userId");

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
    return c.json(
      {
        id: user.userId,
        userId: user.userId,
        planType: user.planType,
        premiumStartDate: user.premiumStartDate,
        nextBillingDate: user.nextBillingDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      200,
    );
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
    return c.json({ error: "ユーザー情報の取得に失敗しました" }, 500);
  }
}

// 管理者用：標準REST - ユーザー更新
export async function updateUser(c: any) {
  // 管理者権限チェック（トークンベース）
  const adminToken = c.req.header("x-admin-token");
  const validAdminToken = c.env?.ADMIN_TOKEN;
  if (!adminToken || adminToken !== validAdminToken) {
    // 管理者トークンがない場合は通常のClerk認証
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db = c.get("db");
  const targetUserId = c.req.param("userId");

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  try {
    const { planType, premiumStartDate, nextBillingDate } = body;
    const now = Math.floor(Date.now() / 1000);

    // 対象ユーザーの存在確認
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, targetUserId))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ error: "ユーザーが見つかりません" }, 404);
    }

    // ユーザー情報を更新
    const updateData: any = { updatedAt: now };
    if (planType !== undefined) updateData.planType = planType;
    if (premiumStartDate !== undefined)
      updateData.premiumStartDate = premiumStartDate;
    if (nextBillingDate !== undefined)
      updateData.nextBillingDate = nextBillingDate;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.userId, targetUserId));

    // 更新後のユーザー情報を取得
    const updatedUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, targetUserId))
      .limit(1);

    const user = updatedUser[0];
    return c.json(
      {
        id: user.userId,
        userId: user.userId,
        planType: user.planType,
        premiumStartDate: user.premiumStartDate,
        nextBillingDate: user.nextBillingDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      200,
    );
  } catch (error) {
    console.error("ユーザー更新エラー:", error);
    return c.json({ error: "ユーザー更新に失敗しました" }, 500);
  }
}

// 管理者用：特定ユーザーのプラン変更（既存互換性維持）
export async function updateSpecificUserPlan(c: any) {
  // 管理者権限チェック（トークンベース）
  const adminToken = c.req.header("x-admin-token");
  const validAdminToken = c.env?.ADMIN_TOKEN;
  if (!adminToken || adminToken !== validAdminToken) {
    // 管理者トークンがない場合は通常のClerk認証
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }
    return c.json({ error: "管理者権限が必要です" }, 403);
  }

  const db = c.get("db");
  const targetUserId = c.req.param("userId");

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  try {
    const { planType } = body;

    if (!planType) {
      return c.json({ error: "planTypeが必要です" }, 400);
    }

    if (!["free", "premium"].includes(planType)) {
      return c.json(
        { error: "planTypeは'free'または'premium'である必要があります" },
        400,
      );
    }

    if (!planType) {
      return c.json({ error: "planTypeが必要です" }, 400);
    }

    if (!["free", "premium"].includes(planType)) {
      return c.json(
        { error: "planTypeは'free'または'premium'である必要があります" },
        400,
      );
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

    return c.json(
      {
        message: `ユーザー ${targetUserId} のプランを${planType}に変更しました`,
        userId: targetUserId,
        planType,
      },
      200,
    );
  } catch (error) {
    console.error("プラン変更エラー:", error);
    return c.json({ error: "プラン変更に失敗しました" }, 500);
  }
}

// 表示名更新の実装
export async function updateDisplayName(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db = c.get("db");

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  try {
    const { displayName } = body;

    if (!displayName || typeof displayName !== "string") {
      return c.json({ error: "表示名は必須です" }, 400);
    }

    if (displayName.length > 50) {
      return c.json({ error: "表示名は50文字以内で入力してください" }, 400);
    }

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
          displayName,
          updatedAt: now,
        })
        .where(eq(users.userId, auth.userId));
    } else {
      // 新規ユーザーの作成
      await db.insert(users).values({
        userId: auth.userId,
        displayName,
        planType: "free",
        createdAt: now,
        updatedAt: now,
      });
    }

    return c.json(
      {
        message: "表示名を更新しました",
        userId: auth.userId,
        displayName,
      },
      200,
    );
  } catch (error) {
    console.error("表示名更新エラー:", error);
    return c.json({ error: "表示名の更新に失敗しました" }, 500);
  }
}
