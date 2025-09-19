import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { teamMemos, teamDeletedMemos } from "../../db/schema/team/memos";
import { teamMembers } from "../../db/schema/team/teams";
import { users } from "../../db/schema/users";
import { generateOriginalId, generateUuid } from "../../utils/originalId";

const app = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
app.use("*", clerkMiddleware());

// データベースミドルウェアを追加
app.use("*", databaseMiddleware);

// 共通スキーマ定義
const TeamMemoSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  userId: z.string(),
  originalId: z.string(),
  uuid: z.string().nullable(),
  title: z.string(),
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  createdBy: z.string().nullable(), // 作成者の表示名
});

const TeamMemoInputSchema = z.object({
  title: z.string().min(1).max(200, "タイトルは200文字以内で入力してください"),
  content: z
    .string()
    .max(10000, "内容は10,000文字以内で入力してください")
    .optional(),
});

// チームメンバー確認のヘルパー関数
async function checkTeamMember(teamId: number, userId: string, db: any) {
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return member.length > 0 ? member[0] : null;
}

// GET /teams/:teamId/memos（チームメモ一覧取得）
app.openapi(
  createRoute({
    method: "get",
    path: "/{teamId}/memos",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "List of team memos",
        content: {
          "application/json": {
            schema: z.array(TeamMemoSchema),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      403: {
        description: "Not a team member",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const result = await db
      .select({
        id: teamMemos.id,
        teamId: teamMemos.teamId,
        userId: teamMemos.userId,
        originalId: teamMemos.originalId,
        uuid: teamMemos.uuid,
        title: teamMemos.title,
        content: teamMemos.content,
        createdAt: teamMemos.createdAt,
        updatedAt: teamMemos.updatedAt,
        createdBy: users.displayName, // 作成者の表示名
      })
      .from(teamMemos)
      .leftJoin(users, eq(teamMemos.userId, users.userId))
      .where(eq(teamMemos.teamId, teamId))
      .orderBy(desc(teamMemos.updatedAt), desc(teamMemos.createdAt));

    return c.json(result, 200);
  },
);

// POST /teams/:teamId/memos（チームメモ作成）
app.openapi(
  createRoute({
    method: "post",
    path: "/{teamId}/memos",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
      }),
      body: {
        content: {
          "application/json": {
            schema: TeamMemoInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created team memo",
        content: {
          "application/json": {
            schema: TeamMemoSchema,
          },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              issues: z.any().optional(),
            }),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      403: {
        description: "Not a team member",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const body = await c.req.json();
    const parsed = TeamMemoInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    const { title, content } = parsed.data;
    const createdAt = Math.floor(Date.now() / 1000);
    const result = await db
      .insert(teamMemos)
      .values({
        teamId,
        userId: auth.userId,
        originalId: "", // 後で更新
        uuid: generateUuid(), // UUID生成
        title,
        content,
        createdAt,
      })
      .returning({ id: teamMemos.id });

    // originalIdを生成して更新
    const originalId = generateOriginalId(result[0].id);
    await db
      .update(teamMemos)
      .set({ originalId, updatedAt: createdAt })
      .where(eq(teamMemos.id, result[0].id));

    // 作成されたメモを作成者情報付きで取得
    const newMemo = await db
      .select({
        id: teamMemos.id,
        teamId: teamMemos.teamId,
        userId: teamMemos.userId,
        originalId: teamMemos.originalId,
        uuid: teamMemos.uuid,
        title: teamMemos.title,
        content: teamMemos.content,
        createdAt: teamMemos.createdAt,
        updatedAt: teamMemos.updatedAt,
        createdBy: users.displayName, // 作成者の表示名
      })
      .from(teamMemos)
      .leftJoin(users, eq(teamMemos.userId, users.userId))
      .where(eq(teamMemos.id, result[0].id))
      .get();

    return c.json(newMemo, 200);
  },
);

// PUT /teams/:teamId/memos/:id（チームメモ更新）
app.openapi(
  createRoute({
    method: "put",
    path: "/{teamId}/memos/{id}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
      body: {
        content: {
          "application/json": {
            schema: TeamMemoInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated team memo",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              issues: z.any().optional(),
            }),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      403: {
        description: "Not a team member",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      404: {
        description: "Team memo not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, id } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const body = await c.req.json();
    const parsed = TeamMemoInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    const { title, content } = parsed.data;
    const result = await db
      .update(teamMemos)
      .set({
        title,
        content,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(and(eq(teamMemos.id, id), eq(teamMemos.teamId, teamId)));

    if (result.changes === 0) {
      return c.json({ error: "Team memo not found" }, 404);
    }

    return c.json({ success: true }, 200);
  },
);

// DELETE /teams/:teamId/memos/:id（チームメモ削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/{teamId}/memos/{id}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "Team memo deleted successfully",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      403: {
        description: "Not a team member",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      404: {
        description: "Team memo not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, id } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    // まず該当メモを取得
    const memo = await db
      .select()
      .from(teamMemos)
      .where(and(eq(teamMemos.id, id), eq(teamMemos.teamId, teamId)))
      .get();

    if (!memo) {
      return c.json({ error: "Team memo not found" }, 404);
    }

    // D1はトランザクションをサポートしないため、順次実行
    try {
      // 削除済みテーブルに挿入
      await db.insert(teamDeletedMemos).values({
        teamId,
        userId: memo.userId,
        originalId: memo.originalId,
        uuid: memo.uuid,
        title: memo.title,
        content: memo.content,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
        deletedAt: Math.floor(Date.now() / 1000),
      });

      // 元テーブルから削除
      await db.delete(teamMemos).where(eq(teamMemos.id, id));
    } catch (error) {
      console.error("メモ削除エラー:", error);
      return c.json({ error: "Failed to delete memo" }, 500);
    }

    return c.json({ success: true }, 200);
  },
);

// GET /teams/:teamId/memos/deleted（削除済みチームメモ一覧）
app.openapi(
  createRoute({
    method: "get",
    path: "/{teamId}/memos/deleted",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "List of deleted team memos",
        content: {
          "application/json": {
            schema: z.array(
              z.object({
                id: z.number(),
                teamId: z.number(),
                originalId: z.string(),
                uuid: z.string().nullable(),
                title: z.string(),
                content: z.string().nullable(),
                createdAt: z.number(),
                updatedAt: z.number().nullable(),
                deletedAt: z.number(),
              }),
            ),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      403: {
        description: "Not a team member",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    try {
      const result = await db
        .select({
          id: teamDeletedMemos.id,
          teamId: teamDeletedMemos.teamId,
          originalId: teamDeletedMemos.originalId,
          uuid: teamDeletedMemos.uuid,
          title: teamDeletedMemos.title,
          content: teamDeletedMemos.content,
          createdAt: teamDeletedMemos.createdAt,
          updatedAt: teamDeletedMemos.updatedAt,
          deletedAt: teamDeletedMemos.deletedAt,
        })
        .from(teamDeletedMemos)
        .where(eq(teamDeletedMemos.teamId, teamId))
        .orderBy(desc(teamDeletedMemos.deletedAt));
      return c.json(result);
    } catch (error) {
      console.error("削除済みチームメモ取得エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// POST /teams/:teamId/memos/deleted/:originalId/restore（チーム削除済みメモ復元）
app.openapi(
  createRoute({
    method: "post",
    path: "/{teamId}/memos/deleted/{originalId}/restore",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        originalId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: TeamMemoSchema,
          },
        },
        description: "復元成功",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "未認証",
      },
      403: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "チームメンバーではない",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "削除済みメモが見つからない",
      },
      500: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "サーバーエラー",
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, originalId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    try {
      // 削除済みメモを検索
      const deletedMemo = await db
        .select()
        .from(teamDeletedMemos)
        .where(
          and(
            eq(teamDeletedMemos.teamId, teamId),
            eq(teamDeletedMemos.originalId, originalId),
          ),
        )
        .limit(1);

      if (deletedMemo.length === 0) {
        return c.json({ error: "削除済みメモが見つかりません" }, 404);
      }

      const memoData = deletedMemo[0];

      // チームメモテーブルに復元
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const insertResult = await db
        .insert(teamMemos)
        .values({
          teamId: memoData.teamId,
          userId: auth.userId,
          originalId: memoData.originalId,
          uuid: memoData.uuid,
          title: memoData.title,
          content: memoData.content,
          createdAt: memoData.createdAt,
          updatedAt: currentTimestamp,
        })
        .returning({ id: teamMemos.id });

      // 復元されたメモを作成者情報付きで取得
      const restoredMemo = await db
        .select({
          id: teamMemos.id,
          teamId: teamMemos.teamId,
          userId: teamMemos.userId,
          originalId: teamMemos.originalId,
          uuid: teamMemos.uuid,
          title: teamMemos.title,
          content: teamMemos.content,
          createdAt: teamMemos.createdAt,
          updatedAt: teamMemos.updatedAt,
          createdBy: users.displayName, // 作成者の表示名
        })
        .from(teamMemos)
        .leftJoin(users, eq(teamMemos.userId, users.userId))
        .where(eq(teamMemos.id, insertResult[0].id))
        .get();

      // 削除済みテーブルから削除
      await db
        .delete(teamDeletedMemos)
        .where(eq(teamDeletedMemos.id, memoData.id));

      return c.json(restoredMemo);
    } catch (error) {
      console.error("チームメモ復元エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// DELETE /teams/:teamId/memos/deleted/:originalId（チーム削除済みメモの完全削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/{teamId}/memos/deleted/{originalId}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        originalId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
        description: "完全削除成功",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "未認証",
      },
      403: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "チームメンバーではない",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "削除済みメモが見つからない",
      },
      500: {
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
        description: "サーバーエラー",
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, originalId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    try {
      // 削除済みメモを検索して完全削除
      const deletedResult = await db
        .delete(teamDeletedMemos)
        .where(
          and(
            eq(teamDeletedMemos.teamId, teamId),
            eq(teamDeletedMemos.originalId, originalId),
          ),
        )
        .returning();

      if (deletedResult.length === 0) {
        return c.json({ error: "削除済みメモが見つかりません" }, 404);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("チーム削除済みメモ完全削除エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// チームメモが所属するボード一覧を取得
const getTeamMemoBoards = createRoute({
  method: "get",
  path: "/{teamId}/memos/{memoId}/boards",
  request: {
    params: z.object({
      teamId: z.string().transform((val) => parseInt(val, 10)),
      memoId: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
            }),
          ),
        },
      },
      description: "チームメモが所属するボード一覧",
    },
    401: { description: "認証エラー" },
    403: { description: "権限エラー" },
    404: { description: "チームまたはメモが見つかりません" },
    500: { description: "サーバーエラー" },
  },
});

app.openapi(getTeamMemoBoards, async (c) => {
  const auth = getAuth(c);
  const { teamId, memoId } = c.req.valid("param");

  if (!auth.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = c.get("db");

    // チームメンバーシップ確認
    const member = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .limit(1);

    if (member.length === 0) {
      return c.json({ error: "チームアクセス権限がありません" }, 403);
    }

    // メモの存在確認
    const memo = await db
      .select({ originalId: teamMemos.originalId })
      .from(teamMemos)
      .where(
        and(eq(teamMemos.originalId, memoId), eq(teamMemos.teamId, teamId)),
      )
      .limit(1);

    if (memo.length === 0) {
      return c.json({ error: "メモが見つかりません" }, 404);
    }

    // ボード一覧を取得（チームボードアイテムテーブルから）
    const { teamBoards, teamBoardItems } = await import(
      "../../db/schema/team/boards"
    );

    const boards = await db
      .select({
        id: teamBoards.id,
        name: teamBoards.name,
      })
      .from(teamBoards)
      .innerJoin(
        teamBoardItems,
        and(
          eq(teamBoardItems.boardId, teamBoards.id),
          eq(teamBoardItems.itemType, "memo"),
          eq(teamBoardItems.originalId, memo[0].originalId),
        ),
      )
      .where(eq(teamBoards.teamId, teamId));

    return c.json(boards);
  } catch (error) {
    console.error("チームメモボード取得エラー:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
