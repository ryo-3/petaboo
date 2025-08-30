import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import Database from "better-sqlite3";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { teamMemos, teamDeletedMemos } from "../../db/schema/team/memos";
import { teamMembers } from "../../db/schema/team/teams";
import { generateOriginalId, generateUuid } from "../../utils/originalId";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const app = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
app.use(
  "*",
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }),
);

// 共通スキーマ定義
const TeamMemoSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  originalId: z.string(),
  uuid: z.string().nullable(),
  title: z.string(),
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

const TeamMemoInputSchema = z.object({
  title: z.string().min(1).max(200, "タイトルは200文字以内で入力してください"),
  content: z
    .string()
    .max(10000, "内容は10,000文字以内で入力してください")
    .optional(),
});

// チームメンバー確認のヘルパー関数
async function checkTeamMember(teamId: number, userId: string) {
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
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const result = await db
      .select({
        id: teamMemos.id,
        teamId: teamMemos.teamId,
        originalId: teamMemos.originalId,
        uuid: teamMemos.uuid,
        title: teamMemos.title,
        content: teamMemos.content,
        createdAt: teamMemos.createdAt,
        updatedAt: teamMemos.updatedAt,
      })
      .from(teamMemos)
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
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId);
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

    // 作成されたメモの完全なオブジェクトを返す
    const newMemo = {
      id: result[0].id,
      teamId,
      originalId,
      uuid: generateUuid(),
      title,
      content: content || "",
      createdAt,
      updatedAt: createdAt,
    };

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
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, id } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId);
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
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, id } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId);
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

    // トランザクションで削除済みテーブルに移動してから元テーブルから削除
    db.transaction((tx) => {
      // 削除済みテーブルに挿入
      tx.insert(teamDeletedMemos)
        .values({
          teamId,
          userId: memo.userId,
          originalId: memo.originalId,
          uuid: memo.uuid,
          title: memo.title,
          content: memo.content,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
          deletedAt: Math.floor(Date.now() / 1000),
        })
        .run();

      // 元テーブルから削除
      tx.delete(teamMemos).where(eq(teamMemos.id, id)).run();
    });

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
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId);
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

export default app;
