import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, desc, and, sql, isNull, isNotNull } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm/alias";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { teamTasks } from "../../db/schema/team/tasks";
import { teamMembers } from "../../db/schema/team/teams";
import { teamComments } from "../../db/schema/team/comments";
import { teamAttachments } from "../../db/schema/team/attachments";
import { teamTaggings } from "../../db/schema/team/tags";
import { users } from "../../db/schema/users";
import { generateTaskDisplayId } from "../../utils/displayId";
import { generateUuid } from "../../utils/originalId";
import {
  getTeamTaskMemberJoin,
  getTeamTaskSelectFields,
} from "../../utils/teamJoinUtils";
import { logActivity } from "../../utils/activity-logger";

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
  displayId: z.string(),
  uuid: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "checking", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.number().nullable(),
  categoryId: z.number().nullable(),
  boardCategoryId: z.number().nullable(),
  assigneeId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  createdBy: z.string().nullable(), // 作成者の表示名
  avatarColor: z.string().nullable(), // 作成者のアバター色
  assigneeName: z.string().nullable(), // 担当者の表示名
  assigneeAvatarColor: z.string().nullable(), // 担当者のアバター色
  commentCount: z.number().optional(), // コメント数
});

const TeamTaskInputSchema = z.object({
  title: z.string().min(1).max(200, "タイトルは200文字以内で入力してください"),
  description: z
    .string()
    .max(10000, "説明は10,000文字以内で入力してください")
    .optional(),
  status: z
    .enum(["todo", "in_progress", "checking", "completed"])
    .default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
  boardCategoryId: z.number().optional(),
  assigneeId: z.string().nullable().optional(),
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
  status: z.enum(["todo", "in_progress", "checking", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
  boardCategoryId: z.number().optional(),
  assigneeId: z.string().nullable().optional(),
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

    try {
      // 担当者用のteamMembersテーブル別名
      const assigneeMembers = aliasedTable(teamMembers, "assignee_members");

      const result = await db
        .select({
          ...getTeamTaskSelectFields(),
          assigneeName: assigneeMembers.displayName,
          assigneeAvatarColor: assigneeMembers.avatarColor,
          commentCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${teamComments}
          WHERE ${teamComments.targetType} = 'task'
            AND ${teamComments.targetDisplayId} = ${teamTasks.displayId}
            AND ${teamComments.teamId} = ${teamTasks.teamId}
        )`.as("commentCount"),
        })
        .from(teamTasks)
        .leftJoin(teamMembers, getTeamTaskMemberJoin())
        .leftJoin(
          assigneeMembers,
          and(
            eq(teamTasks.assigneeId, assigneeMembers.userId),
            eq(teamTasks.teamId, assigneeMembers.teamId),
          ),
        )
        .where(and(eq(teamTasks.teamId, teamId), isNull(teamTasks.deletedAt)))
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
    } catch (error) {
      console.error("❌ [チームタスク一覧取得エラー]", error);
      return c.json({ error: "Internal server error" }, 500);
    }
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
      assigneeId,
    } = parsed.data;

    const normalizedAssigneeId =
      assigneeId && assigneeId !== "" ? assigneeId : null;

    if (normalizedAssigneeId) {
      const assigneeMember = await checkTeamMember(
        db,
        teamId,
        normalizedAssigneeId,
      );
      if (!assigneeMember) {
        return c.json({ error: "Assignee must be a team member" }, 400);
      }
    }

    // displayIdを事前生成
    const displayId = await generateTaskDisplayId(db, teamId);

    const insertData = {
      teamId,
      userId: auth.userId,
      displayId,
      uuid: generateUuid(),
      title,
      description,
      status,
      priority,
      dueDate,
      categoryId,
      boardCategoryId,
      assigneeId: normalizedAssigneeId,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const result = await db
      .insert(teamTasks)
      .values(insertData)
      .returning({ id: teamTasks.id });

    // 作成されたタスクを取得して返す（作成者・担当者情報付き）
    const assigneeMembers = aliasedTable(teamMembers, "assignee_members");

    const newTask = await db
      .select({
        ...getTeamTaskSelectFields(),
        assigneeName: assigneeMembers.displayName,
        assigneeAvatarColor: assigneeMembers.avatarColor,
      })
      .from(teamTasks)
      .leftJoin(teamMembers, getTeamTaskMemberJoin())
      .leftJoin(
        assigneeMembers,
        and(
          eq(teamTasks.assigneeId, assigneeMembers.userId),
          eq(teamTasks.teamId, assigneeMembers.teamId),
        ),
      )
      .where(eq(teamTasks.id, result[0].id))
      .get();

    // アクティビティログを記録
    await logActivity({
      db,
      teamId,
      userId: auth.userId,
      actionType: "task_created",
      targetType: "task",
      targetId: displayId, // 🆕 originalId → displayId
      targetTitle: title,
    });

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

    if (
      "assigneeId" in parsed.data &&
      parsed.data.assigneeId &&
      parsed.data.assigneeId !== ""
    ) {
      const assigneeMember = await checkTeamMember(
        db,
        teamId,
        parsed.data.assigneeId,
      );
      if (!assigneeMember) {
        return c.json({ error: "Assignee must be a team member" }, 400);
      }
    }

    const { assigneeId, ...rest } = parsed.data;
    const updateData = {
      ...rest,
      ...(assigneeId !== undefined
        ? { assigneeId: assigneeId === "" ? null : assigneeId }
        : {}),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    const result = await db
      .update(teamTasks)
      .set(updateData)
      .where(and(eq(teamTasks.id, id), eq(teamTasks.teamId, teamId)));

    if (result.changes === 0) {
      return c.json({ error: "Team task not found" }, 404);
    }

    // 更新後のタスクを取得して返す
    const assigneeMembers = aliasedTable(teamMembers, "assignee_members");

    const updatedTask = await db
      .select({
        ...getTeamTaskSelectFields(),
        assigneeName: assigneeMembers.displayName,
        assigneeAvatarColor: assigneeMembers.avatarColor,
      })
      .from(teamTasks)
      .leftJoin(teamMembers, getTeamTaskMemberJoin())
      .leftJoin(
        assigneeMembers,
        and(
          eq(teamTasks.assigneeId, assigneeMembers.userId),
          eq(teamTasks.teamId, assigneeMembers.teamId),
        ),
      )
      .where(and(eq(teamTasks.id, id), eq(teamTasks.teamId, teamId)))
      .get();

    return c.json(updatedTask || { success: true }, 200);
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
      .where(
        and(
          eq(teamTasks.id, id),
          eq(teamTasks.teamId, teamId),
          isNull(teamTasks.deletedAt),
        ),
      )
      .get();

    if (!task) {
      return c.json({ error: "Team task not found" }, 404);
    }

    // 論理削除
    try {
      console.log(`🗑️ [タスク削除開始] id=${id} displayId="${task.displayId}"`);

      // deleted_atを設定して論理削除
      await db
        .update(teamTasks)
        .set({
          deletedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(teamTasks.id, id));

      console.log(`💾 [論理削除完了] displayId="${task.displayId}"を保持`);
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
                displayId: z.string(),
                uuid: z.string().nullable(),
                title: z.string(),
                description: z.string().nullable(),
                status: z.string(),
                priority: z.string(),
                dueDate: z.number().nullable(),
                categoryId: z.number().nullable(),
                boardCategoryId: z.number().nullable(),
                assigneeId: z.string().nullable(),
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
      const deletedTasks = await db
        .select({
          id: teamTasks.id,
          teamId: teamTasks.teamId,
          displayId: teamTasks.displayId,
          uuid: teamTasks.uuid,
          title: teamTasks.title,
          description: teamTasks.description,
          status: teamTasks.status,
          priority: teamTasks.priority,
          dueDate: teamTasks.dueDate,
          categoryId: teamTasks.categoryId,
          boardCategoryId: teamTasks.boardCategoryId,
          assigneeId: teamTasks.assigneeId,
          createdAt: teamTasks.createdAt,
          updatedAt: teamTasks.updatedAt,
          deletedAt: teamTasks.deletedAt,
        })
        .from(teamTasks)
        .where(
          and(eq(teamTasks.teamId, teamId), isNotNull(teamTasks.deletedAt)),
        )
        .orderBy(desc(teamTasks.deletedAt));

      // 各タスクのコメント数を取得
      const result = await Promise.all(
        deletedTasks.map(async (task) => {
          const comments = await db
            .select({ count: sql<number>`count(*)` })
            .from(teamComments)
            .where(
              and(
                eq(teamComments.teamId, teamId),
                eq(teamComments.targetType, "task"),
                eq(teamComments.targetDisplayId, task.displayId),
              ),
            );

          const commentCount = Number(comments[0]?.count || 0);

          return {
            ...task,
            commentCount,
          };
        }),
      );

      return c.json(result);
    } catch (error) {
      console.error("削除済みチームタスク取得エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// POST /teams/:teamId/tasks/deleted/:displayId/restore（チーム削除済みタスク復元）
app.openapi(
  createRoute({
    method: "post",
    path: "/{teamId}/tasks/deleted/{displayId}/restore",
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

    const { teamId, displayId } = c.req.valid("param");

    // チームメンバー確認
    const member = await checkTeamMember(db, teamId, auth.userId);
    if (!member) {
      return c.json({ error: "Not a team member" }, 403);
    }

    try {
      // 削除済みタスクを検索（元テーブルから）
      const deletedTask = await db
        .select()
        .from(teamTasks)
        .where(
          and(
            eq(teamTasks.teamId, teamId),
            eq(teamTasks.displayId, displayId),
            isNotNull(teamTasks.deletedAt), // 削除済み確認
          ),
        )
        .limit(1);

      if (deletedTask.length === 0) {
        return c.json({ error: "削除済みタスクが見つかりません" }, 404);
      }

      const taskData = deletedTask[0];

      // deleted_atをNULLにして復元
      const currentTimestamp = Math.floor(Date.now() / 1000);
      console.log(`🔄 [タスク復元開始] displayId="${taskData.displayId}"`);

      await db
        .update(teamTasks)
        .set({
          deletedAt: null,
          updatedAt: currentTimestamp,
        })
        .where(eq(teamTasks.id, taskData.id));

      console.log(
        `✅ [タスク復元UPDATE完了] id=${taskData.id} (displayIdは"${taskData.displayId}"のまま)`,
      );

      // 復元されたタスクを作成者情報付きで取得
      const restoredTask = await db
        .select(getTeamTaskSelectFields())
        .from(teamTasks)
        .leftJoin(teamMembers, getTeamTaskMemberJoin())
        .where(eq(teamTasks.id, taskData.id))
        .get();

      console.log(
        `📤 [タスク復元API応答] displayId="${restoredTask?.displayId}"`,
      );

      return c.json(restoredTask);
    } catch (error) {
      console.error("チームタスク復元エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// DELETE /teams/:teamId/tasks/deleted/:displayId（チーム削除済みタスクの完全削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/{teamId}/tasks/deleted/{displayId}",
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
    const env = c.env;
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { teamId, displayId } = c.req.valid("param");

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
            eq(teamAttachments.attachedTo, "task"),
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
            eq(teamAttachments.attachedTo, "task"),
            eq(teamAttachments.attachedDisplayId, displayId),
          ),
        );

      // 3. 紐づくタグを削除
      await db
        .delete(teamTaggings)
        .where(
          and(
            eq(teamTaggings.teamId, teamId),
            eq(teamTaggings.targetType, "task"),
            eq(teamTaggings.targetDisplayId, displayId),
          ),
        );

      // 4. 削除済みタスクを検索して完全削除（元テーブルから物理削除）
      const deletedResult = await db
        .delete(teamTasks)
        .where(
          and(
            eq(teamTasks.teamId, teamId),
            eq(teamTasks.displayId, displayId),
            isNotNull(teamTasks.deletedAt), // 削除済み確認
          ),
        )
        .returning();

      if (deletedResult.length === 0) {
        return c.json({ error: "削除済みタスクが見つかりません" }, 404);
      }

      console.log(
        `🗑️ チームタスク完全削除成功: displayId=${displayId}, teamId=${teamId}`,
      );

      return c.json({ success: true });
    } catch (error) {
      console.error("チーム削除済みタスク完全削除エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export default app;
