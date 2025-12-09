import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, desc, and, sql, isNull, isNotNull } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { teamMemos } from "../../db/schema/team/memos";
import { teamMembers } from "../../db/schema/team/teams";
import { teamComments } from "../../db/schema/team/comments";
import { teamAttachments } from "../../db/schema/team/attachments";
import { teamTaggings } from "../../db/schema/team/tags";
import { users } from "../../db/schema/users";
import { generateMemoDisplayId } from "../../utils/displayId";
import { generateUuid } from "../../utils/originalId";
import {
  getTeamMemoMemberJoin,
  getTeamMemoSelectFields,
} from "../../utils/teamJoinUtils";
import { logActivity } from "../../utils/activity-logger";

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
  displayId: z.string(),
  uuid: z.string().nullable(),
  title: z.string(),
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  createdBy: z.string().nullable(), // 作成者の表示名
  avatarColor: z.string().nullable(), // 作成者のアバター色
  commentCount: z.number().optional(), // コメント数
});

const TeamMemoInputSchema = z.object({
  title: z
    .string()
    .max(200, "タイトルは200文字以内で入力してください")
    .optional()
    .default(""),
  content: z
    .string()
    .max(10000, "内容は10,000文字以内で入力してください")
    .optional(),
  updatedAt: z.number().optional(), // 楽観的ロック用
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
        ...getTeamMemoSelectFields(),
        commentCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${teamComments}
          WHERE ${teamComments.targetType} = 'memo'
            AND ${teamComments.targetDisplayId} = ${teamMemos.displayId}
            AND ${teamComments.teamId} = ${teamMemos.teamId}
        )`.as("commentCount"),
      })
      .from(teamMemos)
      .leftJoin(teamMembers, getTeamMemoMemberJoin())
      .where(and(eq(teamMemos.teamId, teamId), isNull(teamMemos.deletedAt)))
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

    // displayIdを事前生成
    const displayId = await generateMemoDisplayId(db, teamId);

    const result = await db
      .insert(teamMemos)
      .values({
        teamId,
        userId: auth.userId,
        displayId,
        uuid: generateUuid(),
        title,
        content,
        createdAt,
      })
      .returning({ id: teamMemos.id });

    // 作成されたメモを作成者情報付きで取得
    const newMemo = await db
      .select(getTeamMemoSelectFields())
      .from(teamMemos)
      .leftJoin(teamMembers, getTeamMemoMemberJoin())
      .where(eq(teamMemos.id, result[0].id))
      .get();

    // アクティビティログを記録
    await logActivity({
      db,
      teamId,
      userId: auth.userId,
      actionType: "memo_created",
      targetType: "memo",
      targetId: displayId, // 🆕 originalId → displayId
      targetTitle: title,
    });

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
      409: {
        description: "Conflict - data was modified by another user",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              message: z.string(),
              latestData: TeamMemoSchema.optional(),
            }),
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

    // 楽観的ロック: updatedAt を抽出して競合チェック
    const { title, content, updatedAt: clientUpdatedAt } = parsed.data;

    // 競合チェック（クライアントから updatedAt が送信された場合のみ）
    if (clientUpdatedAt !== undefined) {
      const currentMemo = await db
        .select({ updatedAt: teamMemos.updatedAt })
        .from(teamMemos)
        .where(and(eq(teamMemos.id, id), eq(teamMemos.teamId, teamId)))
        .get();

      if (!currentMemo) {
        return c.json({ error: "Team memo not found" }, 404);
      }

      // DB の updatedAt とクライアントの updatedAt を比較
      if (currentMemo.updatedAt !== clientUpdatedAt) {
        // 最新データを取得して返す
        const latestMemo = await db
          .select(getTeamMemoSelectFields())
          .from(teamMemos)
          .leftJoin(teamMembers, getTeamMemoMemberJoin())
          .where(and(eq(teamMemos.id, id), eq(teamMemos.teamId, teamId)))
          .get();

        return c.json(
          {
            error: "Conflict",
            message: "他のメンバーが変更しました",
            latestData: latestMemo,
          },
          409,
        );
      }
    }

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

    // 更新後のメモを取得して返す
    const updatedMemo = await db
      .select(getTeamMemoSelectFields())
      .from(teamMemos)
      .leftJoin(teamMembers, getTeamMemoMemberJoin())
      .where(and(eq(teamMemos.id, id), eq(teamMemos.teamId, teamId)))
      .get();

    return c.json(updatedMemo || { success: true }, 200);
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

    console.log(
      `🗑️ チームメモ削除リクエスト: teamId=${teamId}, id=${id}, userId=${auth.userId}`,
    );

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      console.log(
        `❌ チームメンバー確認失敗: teamId=${teamId}, userId=${auth.userId}`,
      );
      return c.json({ error: "Not a team member" }, 403);
    }

    console.log(
      `✅ チームメンバー確認成功: teamId=${teamId}, userId=${auth.userId}, memberRole=${member.role}`,
    );

    // まず該当メモを取得
    const memo = await db
      .select()
      .from(teamMemos)
      .where(
        and(
          eq(teamMemos.id, id),
          eq(teamMemos.teamId, teamId),
          isNull(teamMemos.deletedAt),
        ),
      )
      .get();

    console.log(`🔍 チームメモ検索結果:`, {
      memo: memo
        ? {
            id: memo.id,
            teamId: memo.teamId,
            userId: memo.userId,
            title: memo.title,
          }
        : null,
    });

    if (!memo) {
      return c.json({ error: "Team memo not found" }, 404);
    }

    try {
      console.log(`🗑️ [削除開始] id=${id} displayId="${memo.displayId}"`);

      // 論理削除（deleted_atを設定）
      await db
        .update(teamMemos)
        .set({
          deletedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(teamMemos.id, id));

      console.log(
        `✅ チームメモ削除成功: id=${id}, teamId=${teamId}, displayId="${memo.displayId}"`,
      );
    } catch (error) {
      console.error("チームメモ削除エラー:", error);
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
                displayId: z.string(),
                uuid: z.string().nullable(),
                title: z.string(),
                content: z.string().nullable(),
                createdAt: z.number(),
                updatedAt: z.number().nullable(),
                deletedAt: z.number(),
                commentCount: z.number(),
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
      const deletedMemos = await db
        .select({
          id: teamMemos.id,
          teamId: teamMemos.teamId,
          displayId: teamMemos.displayId,
          title: teamMemos.title,
          content: teamMemos.content,
          createdAt: teamMemos.createdAt,
          updatedAt: teamMemos.updatedAt,
          deletedAt: teamMemos.deletedAt,
        })
        .from(teamMemos)
        .where(
          and(eq(teamMemos.teamId, teamId), isNotNull(teamMemos.deletedAt)),
        )
        .orderBy(desc(teamMemos.deletedAt));

      // 各メモのコメント数を取得
      const result = await Promise.all(
        deletedMemos.map(async (memo) => {
          const comments = await db
            .select({ count: sql<number>`count(*)` })
            .from(teamComments)
            .where(
              and(
                eq(teamComments.teamId, teamId),
                eq(teamComments.targetType, "memo"),
                eq(teamComments.targetDisplayId, memo.displayId),
              ),
            );

          const commentCount = Number(comments[0]?.count || 0);

          return {
            ...memo,
            commentCount,
          };
        }),
      );

      return c.json(result);
    } catch (error) {
      console.error("削除済みチームメモ取得エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// POST /teams/:teamId/memos/deleted/:displayId/restore（チーム削除済みメモ復元）
app.openapi(
  createRoute({
    method: "post",
    path: "/{teamId}/memos/deleted/{displayId}/restore",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        displayId: z.string(),
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

    const { teamId, displayId } = c.req.valid("param");

    console.log(
      `🔄 チームメモ復元リクエスト: teamId=${teamId}, displayId=${displayId}, userId=${auth.userId}`,
    );

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      console.log(
        `❌ チームメンバー確認失敗: teamId=${teamId}, userId=${auth.userId}`,
      );
      return c.json({ error: "Not a team member" }, 403);
    }

    console.log(
      `✅ チームメンバー確認成功: teamId=${teamId}, userId=${auth.userId}, memberRole=${member.role}`,
    );

    try {
      // 削除済みメモを検索（元テーブルから）
      const deletedMemo = await db
        .select()
        .from(teamMemos)
        .where(
          and(
            eq(teamMemos.teamId, teamId),
            eq(teamMemos.displayId, displayId),
            isNotNull(teamMemos.deletedAt), // 削除済み確認
          ),
        )
        .limit(1);

      console.log(`🔍 削除済みメモ検索結果:`, {
        found: deletedMemo.length > 0,
        teamId,
        displayId,
      });

      if (deletedMemo.length === 0) {
        console.log(
          `❌ 削除済みメモが見つからない: teamId=${teamId}, displayId=${displayId}`,
        );
        return c.json({ error: "削除済みメモが見つかりません" }, 404);
      }

      const memoData = deletedMemo[0];
      console.log(`📋 復元対象メモ:`, {
        id: memoData.id,
        title: memoData.title,
        userId: memoData.userId,
      });

      // deleted_atをNULLにして復元
      const currentTimestamp = Math.floor(Date.now() / 1000);
      console.log(`🔄 [復元開始] displayId="${memoData.displayId}"`);

      await db
        .update(teamMemos)
        .set({
          deletedAt: null,
          updatedAt: currentTimestamp,
        })
        .where(eq(teamMemos.id, memoData.id));

      console.log(
        `✅ [復元UPDATE完了] id=${memoData.id} (displayIdは"${memoData.displayId}"のまま)`,
      );

      // 復元されたメモを作成者情報付きで取得
      const restoredMemo = await db
        .select(getTeamMemoSelectFields())
        .from(teamMemos)
        .leftJoin(teamMembers, getTeamMemoMemberJoin())
        .where(eq(teamMemos.id, memoData.id))
        .get();

      console.log(`📤 [復元API応答] displayId="${restoredMemo?.displayId}"`);

      console.log(
        `✅ チームメモ復元成功: id=${memoData.id}, title=${memoData.title}, teamId=${teamId}`,
      );

      return c.json(restoredMemo);
    } catch (error) {
      console.error("チームメモ復元エラー:", error);
      console.error("復元エラーの詳細:", {
        teamId,
        displayId,
        userId: auth.userId,
        error,
        errorMessage: error instanceof Error ? error.message : "不明なエラー",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// DELETE /teams/:teamId/memos/deleted/:displayId（チーム削除済みメモの完全削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/{teamId}/memos/deleted/{displayId}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        displayId: z.string(),
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
    const env = c.env;
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, displayId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(teamId, auth.userId, db);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    try {
      // 1. 紐づくコメントを削除
      await db
        .delete(teamComments)
        .where(
          and(
            eq(teamComments.teamId, teamId),
            eq(teamComments.targetType, "memo"),
            eq(teamComments.targetDisplayId, displayId),
          ),
        );

      // 2. 紐づく添付ファイルを削除（R2からも削除）
      const attachmentsToDelete = await db
        .select()
        .from(teamAttachments)
        .where(
          and(
            eq(teamAttachments.teamId, teamId),
            eq(teamAttachments.attachedTo, "memo"),
            eq(teamAttachments.attachedDisplayId, displayId),
          ),
        );

      // R2から実ファイルを削除
      const r2Bucket = env.R2_BUCKET;
      if (r2Bucket && attachmentsToDelete.length > 0) {
        for (const attachment of attachmentsToDelete) {
          try {
            await r2Bucket.delete(attachment.r2Key);
          } catch (error) {
            console.error(`❌ [R2削除失敗] ${attachment.r2Key}`, error);
            // R2削除失敗してもDB削除は続行
          }
        }
      }

      // DBから添付ファイルレコードを削除
      await db
        .delete(teamAttachments)
        .where(
          and(
            eq(teamAttachments.teamId, teamId),
            eq(teamAttachments.attachedTo, "memo"),
            eq(teamAttachments.attachedDisplayId, displayId),
          ),
        );

      // 3. 紐づくタグを削除
      await db
        .delete(teamTaggings)
        .where(
          and(
            eq(teamTaggings.teamId, teamId),
            eq(teamTaggings.targetType, "memo"),
            eq(teamTaggings.targetDisplayId, displayId),
          ),
        );

      // 4. 削除済みメモを検索して完全削除（元テーブルから物理削除）
      const deletedResult = await db
        .delete(teamMemos)
        .where(
          and(
            eq(teamMemos.teamId, teamId),
            eq(teamMemos.displayId, displayId),
            isNotNull(teamMemos.deletedAt), // 削除済み確認
          ),
        )
        .returning();

      if (deletedResult.length === 0) {
        return c.json({ error: "削除済みメモが見つかりません" }, 404);
      }

      console.log(
        `🗑️ チームメモ完全削除成功: displayId=${displayId}, teamId=${teamId}`,
      );

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
      .select({ displayId: teamMemos.displayId })
      .from(teamMemos)
      .where(
        and(
          eq(teamMemos.displayId, memoId),
          eq(teamMemos.teamId, teamId),
          isNull(teamMemos.deletedAt),
        ),
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
          eq(teamBoardItems.displayId, memo[0].displayId),
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
