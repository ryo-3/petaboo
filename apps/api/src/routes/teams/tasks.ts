import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { teamTasks, teamDeletedTasks } from "../../db/schema/team/tasks";
import { teamMembers } from "../../db/schema/team/teams";
import { teamComments } from "../../db/schema/team/comments";
import { teamAttachments } from "../../db/schema/team/attachments";
import { users } from "../../db/schema/users";
import { generateOriginalId, generateUuid } from "../../utils/originalId";
import {
  getTeamTaskMemberJoin,
  getTeamTaskSelectFields,
} from "../../utils/teamJoinUtils";

const app = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
app.use("*", clerkMiddleware());

// データベースミドルウェアを追加
app.use("*", databaseMiddleware);

// 共通スキーマ定義
const TeamTaskSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  userId: z.string(),
  originalId: z.string(),
  uuid: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.number().nullable(),
  categoryId: z.number().nullable(),
  boardCategoryId: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  createdBy: z.string().nullable(), // 作成者の表示名
  avatarColor: z.string().nullable(), // 作成者のアバター色
  commentCount: z.number().optional(), // コメント数
});

const TeamTaskInputSchema = z.object({
  title: z.string().min(1).max(200, "タイトルは200文字以内で入力してください"),
  description: z
    .string()
    .max(10000, "説明は10,000文字以内で入力してください")
    .optional(),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
  boardCategoryId: z.number().optional(),
});

const TeamTaskUpdateSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200, "タイトルは200文字以内で入力してください")
    .optional(),
  description: z
    .string()
    .max(10000, "説明は10,000文字以内で入力してください")
    .optional(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
  boardCategoryId: z.number().optional(),
});

// チームメンバー確認のヘルパー関数
async function checkTeamMember(db: any, teamId: number, userId: string) {
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return member.length > 0 ? member[0] : null;
}

// GET /teams/:teamId/tasks（チームタスク一覧取得）
app.openapi(
  createRoute({
    method: "get",
    path: "/{teamId}/tasks",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "List of team tasks",
        content: {
          "application/json": {
            schema: z.array(TeamTaskSchema),
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
    const member = await checkTeamMember(db, teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const result = await db
      .select({
        ...getTeamTaskSelectFields(),
        commentCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${teamComments}
          WHERE ${teamComments.targetType} = 'task'
            AND ${teamComments.targetOriginalId} = ${teamTasks.originalId}
            AND ${teamComments.teamId} = ${teamTasks.teamId}
        )`.as("commentCount"),
      })
      .from(teamTasks)
      .leftJoin(teamMembers, getTeamTaskMemberJoin())
      .where(eq(teamTasks.teamId, teamId))
      .orderBy(
        // 優先度順: high(3) > medium(2) > low(1)
        desc(
          sql`CASE
            WHEN ${teamTasks.priority} = 'high' THEN 3
            WHEN ${teamTasks.priority} = 'medium' THEN 2
            WHEN ${teamTasks.priority} = 'low' THEN 1
            ELSE 0
          END`,
        ),
        desc(teamTasks.updatedAt),
        desc(teamTasks.createdAt),
      );

    return c.json(result, 200);
  },
);

// POST /teams/:teamId/tasks（チームタスク作成）
app.openapi(
  createRoute({
    method: "post",
    path: "/{teamId}/tasks",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
      }),
      body: {
        content: {
          "application/json": {
            schema: TeamTaskInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created team task",
        content: {
          "application/json": {
            schema: TeamTaskSchema,
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
    const member = await checkTeamMember(db, teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const body = await c.req.json();
    const parsed = TeamTaskInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      categoryId,
      boardCategoryId,
    } = parsed.data;

    const insertData = {
      teamId,
      userId: auth.userId,
      originalId: "", // 後で更新
      uuid: generateUuid(), // UUID生成
      title,
      description,
      status,
      priority,
      dueDate,
      categoryId,
      boardCategoryId,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const result = await db
      .insert(teamTasks)
      .values(insertData)
      .returning({ id: teamTasks.id });

    // originalIdを生成して更新
    const originalId = generateOriginalId(result[0].id);
    await db
      .update(teamTasks)
      .set({ originalId })
      .where(eq(teamTasks.id, result[0].id));

    // 作成されたタスクを取得して返す（作成者情報付き）
    const newTask = await db
      .select(getTeamTaskSelectFields())
      .from(teamTasks)
      .leftJoin(teamMembers, getTeamTaskMemberJoin())
      .where(eq(teamTasks.id, result[0].id))
      .get();

    return c.json(newTask, 200);
  },
);

// PUT /teams/:teamId/tasks/:id（チームタスク更新）
app.openapi(
  createRoute({
    method: "put",
    path: "/{teamId}/tasks/{id}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
      body: {
        content: {
          "application/json": {
            schema: TeamTaskUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated team task",
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
        description: "Team task not found",
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
    const member = await checkTeamMember(db, teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    const body = await c.req.json();
    const parsed = TeamTaskUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    const updateData = {
      ...parsed.data,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    const result = await db
      .update(teamTasks)
      .set(updateData)
      .where(and(eq(teamTasks.id, id), eq(teamTasks.teamId, teamId)));

    if (result.changes === 0) {
      return c.json({ error: "Team task not found" }, 404);
    }

    return c.json({ success: true }, 200);
  },
);

// DELETE /teams/:teamId/tasks/:id（チームタスク削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/{teamId}/tasks/{id}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "Team task deleted successfully",
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
        description: "Team task not found",
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
    const member = await checkTeamMember(db, teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    // まず該当タスクを取得
    const task = await db
      .select()
      .from(teamTasks)
      .where(and(eq(teamTasks.id, id), eq(teamTasks.teamId, teamId)))
      .get();

    if (!task) {
      return c.json({ error: "Team task not found" }, 404);
    }

    // D1はトランザクションをサポートしないため、順次実行
    try {
      // 削除済みテーブルに挿入
      await db.insert(teamDeletedTasks).values({
        teamId,
        userId: task.userId,
        originalId: task.originalId,
        uuid: task.uuid,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        categoryId: task.categoryId,
        boardCategoryId: task.boardCategoryId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        deletedAt: Math.floor(Date.now() / 1000),
      });

      // 元テーブルから削除
      await db.delete(teamTasks).where(eq(teamTasks.id, id));
    } catch (error) {
      console.error("チームタスク削除エラー:", error);
      return c.json({ error: "Failed to delete team task" }, 500);
    }

    return c.json({ success: true }, 200);
  },
);

// GET /teams/:teamId/tasks/deleted（削除済みチームタスク一覧）
app.openapi(
  createRoute({
    method: "get",
    path: "/{teamId}/tasks/deleted",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "List of deleted team tasks",
        content: {
          "application/json": {
            schema: z.array(
              z.object({
                id: z.number(),
                teamId: z.number(),
                originalId: z.string(),
                uuid: z.string().nullable(),
                title: z.string(),
                description: z.string().nullable(),
                status: z.string(),
                priority: z.string(),
                dueDate: z.number().nullable(),
                categoryId: z.number().nullable(),
                boardCategoryId: z.number().nullable(),
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(db, teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    try {
      const result = await db
        .select({
          id: teamDeletedTasks.id,
          teamId: teamDeletedTasks.teamId,
          originalId: teamDeletedTasks.originalId,
          uuid: teamDeletedTasks.uuid,
          title: teamDeletedTasks.title,
          description: teamDeletedTasks.description,
          status: teamDeletedTasks.status,
          priority: teamDeletedTasks.priority,
          dueDate: teamDeletedTasks.dueDate,
          categoryId: teamDeletedTasks.categoryId,
          boardCategoryId: teamDeletedTasks.boardCategoryId,
          createdAt: teamDeletedTasks.createdAt,
          updatedAt: teamDeletedTasks.updatedAt,
          deletedAt: teamDeletedTasks.deletedAt,
        })
        .from(teamDeletedTasks)
        .where(eq(teamDeletedTasks.teamId, teamId))
        .orderBy(desc(teamDeletedTasks.deletedAt));
      return c.json(result);
    } catch (error) {
      console.error("削除済みチームタスク取得エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// POST /teams/:teamId/tasks/deleted/:originalId/restore（チーム削除済みタスク復元）
app.openapi(
  createRoute({
    method: "post",
    path: "/{teamId}/tasks/deleted/{originalId}/restore",
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
            schema: TeamTaskSchema,
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
        description: "削除済みタスクが見つからない",
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
    const member = await checkTeamMember(db, teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    try {
      // 削除済みタスクを検索
      const deletedTask = await db
        .select()
        .from(teamDeletedTasks)
        .where(
          and(
            eq(teamDeletedTasks.teamId, teamId),
            eq(teamDeletedTasks.originalId, originalId),
          ),
        )
        .limit(1);

      if (deletedTask.length === 0) {
        return c.json({ error: "削除済みタスクが見つかりません" }, 404);
      }

      const taskData = deletedTask[0];

      // チームタスクテーブルに復元
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const insertResult = await db
        .insert(teamTasks)
        .values({
          teamId: taskData.teamId,
          userId: auth.userId,
          originalId: taskData.originalId,
          uuid: taskData.uuid,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          categoryId: taskData.categoryId,
          boardCategoryId: taskData.boardCategoryId,
          createdAt: taskData.createdAt,
          updatedAt: currentTimestamp,
        })
        .returning({ id: teamTasks.id });

      // 復元されたタスクを作成者情報付きで取得
      const restoredTask = await db
        .select(getTeamTaskSelectFields())
        .from(teamTasks)
        .leftJoin(teamMembers, getTeamTaskMemberJoin())
        .where(eq(teamTasks.id, insertResult[0].id))
        .get();

      // 削除済みテーブルから削除
      await db
        .delete(teamDeletedTasks)
        .where(eq(teamDeletedTasks.id, taskData.id));

      return c.json(restoredTask);
    } catch (error) {
      console.error("チームタスク復元エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// DELETE /teams/:teamId/tasks/deleted/:originalId（チーム削除済みタスクの完全削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/{teamId}/tasks/deleted/{originalId}",
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
        description: "削除済みタスクが見つからない",
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
    const member = await checkTeamMember(db, teamId, auth.userId);
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
            eq(teamComments.targetType, "task"),
            eq(teamComments.targetOriginalId, originalId),
          ),
        );

      // 2. 紐づく添付ファイルを削除
      await db
        .delete(teamAttachments)
        .where(
          and(
            eq(teamAttachments.teamId, teamId),
            eq(teamAttachments.attachedTo, "task"),
            eq(teamAttachments.attachedOriginalId, originalId),
          ),
        );

      // 3. 削除済みタスクを検索して完全削除
      const deletedResult = await db
        .delete(teamDeletedTasks)
        .where(
          and(
            eq(teamDeletedTasks.teamId, teamId),
            eq(teamDeletedTasks.originalId, originalId),
          ),
        )
        .returning();

      if (deletedResult.length === 0) {
        return c.json({ error: "削除済みタスクが見つかりません" }, 404);
      }

      console.log(
        `🗑️ チームタスク完全削除成功: originalId=${originalId}, teamId=${teamId}`,
      );

      return c.json({ success: true });
    } catch (error) {
      console.error("チーム削除済みタスク完全削除エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export default app;
