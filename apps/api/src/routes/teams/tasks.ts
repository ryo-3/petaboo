import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, desc, and, sql, isNull, isNotNull } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm/alias";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { teamTasks, teamTaskStatusHistory } from "../../db/schema/team/tasks";
import { teamMembers, teams } from "../../db/schema/team/teams";
import { teamNotifications } from "../../db/schema/team/notifications";
import { teamComments } from "../../db/schema/team/comments";
import { teamAttachments } from "../../db/schema/team/attachments";
import { teamTaggings } from "../../db/schema/team/tags";
import { teamSlackConfigs } from "../../db/schema/team/slack-configs";
import { boardSlackConfigs } from "../../db/schema/team/board-slack-configs";
import { teamBoardItems, teamBoards } from "../../db/schema/team/boards";
import { users } from "../../db/schema/users";
import { generateTaskDisplayId } from "../../utils/displayId";
import { generateUuid } from "../../utils/originalId";
import {
  getTeamTaskMemberJoin,
  getTeamTaskSelectFields,
} from "../../utils/teamJoinUtils";
import { logActivity } from "../../utils/activity-logger";
import { decryptWebhookUrl, hasEncryptionKey } from "../../utils/encryption";
import {
  sendSlackNotification,
  formatAssigneeNotification,
} from "../../utils/slack-notifier";

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
  updatedBy: z.string().nullable(), // 最終編集者のユーザーID
  createdBy: z.string().nullable(), // 作成者の表示名
  avatarColor: z.string().nullable(), // 作成者のアバター色
  assigneeName: z.string().nullable(), // 担当者の表示名
  assigneeAvatarColor: z.string().nullable(), // 担当者のアバター色
  updatedByName: z.string().nullable(), // 最終編集者の表示名
  updatedByAvatarColor: z.string().nullable(), // 最終編集者のアバター色
  commentCount: z.number().optional(), // コメント数
  completedAt: z.number().nullable().optional(), // 完了日時（ステータス履歴から取得）
  completedBy: z.string().nullable().optional(), // 完了させたユーザーID
  completedByName: z.string().nullable().optional(), // 完了させたユーザー名
  completedByAvatarColor: z.string().nullable().optional(), // 完了させたユーザーのアバター色
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
  notificationUrl: z.string().optional(), // 通知用: 現在のURLクエリ
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
  updatedAt: z.number().optional(), // 楽観的ロック用
  notificationUrl: z.string().optional(), // 通知用: 現在のURLクエリ
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

// 担当者設定時のSlack通知送信
async function sendAssigneeSlackNotification(
  db: any,
  env: any,
  teamId: number,
  assigneeId: string,
  assignerName: string,
  taskTitle: string,
  taskDisplayId: string,
  notificationUrl?: string, // フロントから渡されたURLクエリ
) {
  try {
    // タスクがボードに所属しているか確認（Slack設定取得用）
    const boardItems = await db
      .select({ boardId: teamBoardItems.boardId })
      .from(teamBoardItems)
      .where(
        and(
          eq(teamBoardItems.itemType, "task"),
          eq(teamBoardItems.displayId, taskDisplayId),
        ),
      )
      .limit(1);

    const boardId = boardItems.length > 0 ? boardItems[0].boardId : null;

    // Slack設定を取得（ボード専用 > チーム全体）
    let slackConfig: any[] = [];
    if (boardId) {
      const boardSlackConfig = await db
        .select()
        .from(boardSlackConfigs)
        .where(
          and(
            eq(boardSlackConfigs.boardId, boardId),
            eq(boardSlackConfigs.isEnabled, true),
          ),
        )
        .limit(1);

      if (boardSlackConfig.length > 0) {
        slackConfig = boardSlackConfig;
      }
    }

    if (slackConfig.length === 0) {
      const teamSlackConfig = await db
        .select()
        .from(teamSlackConfigs)
        .where(
          and(
            eq(teamSlackConfigs.teamId, teamId),
            eq(teamSlackConfigs.isEnabled, true),
          ),
        )
        .limit(1);

      slackConfig = teamSlackConfig;
    }

    if (slackConfig.length === 0) {
      return; // Slack設定なし
    }

    // Webhook URLを復号化
    const encryptionKey = env?.ENCRYPTION_KEY;
    let webhookUrl = slackConfig[0].webhookUrl;

    if (encryptionKey && hasEncryptionKey(env)) {
      const decrypted = await decryptWebhookUrl(webhookUrl, encryptionKey);
      if (!decrypted.startsWith("https://hooks.slack.com/")) {
        return;
      }
      webhookUrl = decrypted;
    }

    // 担当者の表示名を取得
    const assigneeMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, assigneeId)),
      )
      .limit(1);

    const assigneeName =
      assigneeMember.length > 0
        ? assigneeMember[0].displayName || "Unknown"
        : "Unknown";

    // チーム情報を取得
    const teamData = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    const teamCustomUrl =
      teamData.length > 0 ? teamData[0].customUrl : String(teamId);

    // リンクURLを生成（フロントから渡されたURLクエリをそのまま使用）
    const appBaseUrl = env?.FRONTEND_URL || "https://petaboo.vercel.app";
    const linkUrl = notificationUrl
      ? `${appBaseUrl}/team/${teamCustomUrl}?${notificationUrl}`
      : `${appBaseUrl}/team/${teamCustomUrl}`;

    // 通知メッセージを送信
    const message = formatAssigneeNotification(
      assigneeName,
      assignerName,
      taskTitle,
      linkUrl,
    );

    await sendSlackNotification(webhookUrl, message);
  } catch (error) {
    console.error("❌ Assignee Slack notification failed:", error);
  }
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
      // 最終編集者用のteamMembersテーブル別名
      const updatedByMembers = aliasedTable(teamMembers, "updated_by_members");

      const result = await db
        .select({
          ...getTeamTaskSelectFields(),
          assigneeName: assigneeMembers.displayName,
          assigneeAvatarColor: assigneeMembers.avatarColor,
          updatedByName: updatedByMembers.displayName,
          updatedByAvatarColor: updatedByMembers.avatarColor,
          commentCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${teamComments}
          WHERE ${teamComments.targetType} = 'task'
            AND ${teamComments.targetDisplayId} = ${teamTasks.displayId}
            AND ${teamComments.teamId} = ${teamTasks.teamId}
        )`.as("commentCount"),
          // 最新の完了日時（status_historyから取得）
          completedAt: sql<number | null>`(
          SELECT ${teamTaskStatusHistory.changedAt}
          FROM ${teamTaskStatusHistory}
          WHERE ${teamTaskStatusHistory.taskId} = ${teamTasks.id}
            AND ${teamTaskStatusHistory.teamId} = ${teamTasks.teamId}
            AND ${teamTaskStatusHistory.toStatus} = 'completed'
          ORDER BY ${teamTaskStatusHistory.changedAt} DESC
          LIMIT 1
        )`.as("completedAt"),
          // 完了させたユーザーID（status_historyから取得）
          completedBy: sql<string | null>`(
          SELECT ${teamTaskStatusHistory.userId}
          FROM ${teamTaskStatusHistory}
          WHERE ${teamTaskStatusHistory.taskId} = ${teamTasks.id}
            AND ${teamTaskStatusHistory.teamId} = ${teamTasks.teamId}
            AND ${teamTaskStatusHistory.toStatus} = 'completed'
          ORDER BY ${teamTaskStatusHistory.changedAt} DESC
          LIMIT 1
        )`.as("completedBy"),
          // 完了させたユーザー名（status_history + team_members から取得）
          completedByName: sql<string | null>`(
          SELECT tm.display_name
          FROM ${teamTaskStatusHistory} tsh
          LEFT JOIN ${teamMembers} tm ON tsh.user_id = tm.user_id AND tsh.team_id = tm.team_id
          WHERE tsh.task_id = ${teamTasks.id}
            AND tsh.team_id = ${teamTasks.teamId}
            AND tsh.to_status = 'completed'
          ORDER BY tsh.changed_at DESC
          LIMIT 1
        )`.as("completedByName"),
          // 完了させたユーザーのアバター色
          completedByAvatarColor: sql<string | null>`(
          SELECT tm.avatar_color
          FROM ${teamTaskStatusHistory} tsh
          LEFT JOIN ${teamMembers} tm ON tsh.user_id = tm.user_id AND tsh.team_id = tm.team_id
          WHERE tsh.task_id = ${teamTasks.id}
            AND tsh.team_id = ${teamTasks.teamId}
            AND tsh.to_status = 'completed'
          ORDER BY tsh.changed_at DESC
          LIMIT 1
        )`.as("completedByAvatarColor"),
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
        .leftJoin(
          updatedByMembers,
          and(
            eq(teamTasks.updatedBy, updatedByMembers.userId),
            eq(teamTasks.teamId, updatedByMembers.teamId),
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
      notificationUrl,
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
    const updatedByMembers = aliasedTable(teamMembers, "updated_by_members");

    const newTask = await db
      .select({
        ...getTeamTaskSelectFields(),
        assigneeName: assigneeMembers.displayName,
        assigneeAvatarColor: assigneeMembers.avatarColor,
        updatedByName: updatedByMembers.displayName,
        updatedByAvatarColor: updatedByMembers.avatarColor,
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
      .leftJoin(
        updatedByMembers,
        and(
          eq(teamTasks.updatedBy, updatedByMembers.userId),
          eq(teamTasks.teamId, updatedByMembers.teamId),
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

    // 担当者が設定された場合、通知を作成
    // 条件: 自分以外を担当者に設定した場合のみ
    if (
      normalizedAssigneeId !== null &&
      normalizedAssigneeId !== auth.userId // 自分自身への設定は通知しない
    ) {
      await db.insert(teamNotifications).values({
        teamId,
        userId: normalizedAssigneeId,
        type: "assignee",
        sourceType: "task",
        sourceId: result[0].id,
        targetType: "task",
        targetDisplayId: displayId,
        boardDisplayId: notificationUrl || null, // URLクエリをそのまま保存
        actorUserId: auth.userId,
        message: `${member.displayName || "誰か"}さんがあなたを担当者に設定しました`,
        isRead: 0,
        createdAt: Date.now(),
      });

      // Slack通知を送信
      await sendAssigneeSlackNotification(
        db,
        c.env,
        teamId,
        normalizedAssigneeId,
        member.displayName || "誰か",
        title,
        displayId,
        notificationUrl,
      );
    }

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
      409: {
        description: "Conflict - data was modified by another user",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              message: z.string(),
              latestData: TeamTaskSchema.optional(),
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

    // 楽観的ロック: updatedAt を抽出して競合チェック
    const {
      updatedAt: clientUpdatedAt,
      assigneeId,
      notificationUrl,
      ...rest
    } = parsed.data;

    // ステータス変更履歴のため、既存タスクを取得
    const existingTask = await db
      .select()
      .from(teamTasks)
      .where(and(eq(teamTasks.id, id), eq(teamTasks.teamId, teamId)))
      .get();

    if (!existingTask) {
      return c.json({ error: "Team task not found" }, 404);
    }

    // 競合チェック（クライアントから updatedAt が送信された場合のみ）
    if (clientUpdatedAt !== undefined) {
      // DB の updatedAt とクライアントの updatedAt を比較
      if (existingTask.updatedAt !== clientUpdatedAt) {
        // 最新データを取得して返す
        const assigneeMembers = aliasedTable(teamMembers, "assignee_members");

        const latestTask = await db
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

        return c.json(
          {
            error: "Conflict",
            message: "他のメンバーが変更しました",
            latestData: latestTask,
          },
          409,
        );
      }
    }

    if (assigneeId !== undefined && assigneeId && assigneeId !== "") {
      const assigneeMember = await checkTeamMember(db, teamId, assigneeId);
      if (!assigneeMember) {
        return c.json({ error: "Assignee must be a team member" }, 400);
      }
    }

    // ステータス変更のみかどうかをチェック
    const isStatusOnlyChange =
      rest.status !== undefined &&
      rest.status !== existingTask.status &&
      rest.title === existingTask.title &&
      rest.description === existingTask.description &&
      rest.priority === existingTask.priority &&
      (rest.dueDate === undefined || rest.dueDate === existingTask.dueDate) &&
      (rest.categoryId === undefined ||
        rest.categoryId === existingTask.categoryId) &&
      (rest.boardCategoryId === undefined ||
        rest.boardCategoryId === existingTask.boardCategoryId) &&
      (assigneeId === undefined || assigneeId === existingTask.assigneeId);

    const updateData = {
      ...rest,
      ...(assigneeId !== undefined
        ? { assigneeId: assigneeId === "" ? null : assigneeId }
        : {}),
      // ステータス変更のみの場合はupdatedAt/updatedByを更新しない
      ...(!isStatusOnlyChange
        ? {
            updatedAt: Math.floor(Date.now() / 1000),
            updatedBy: auth.userId,
          }
        : {}),
    };

    await db
      .update(teamTasks)
      .set(updateData)
      .where(and(eq(teamTasks.id, id), eq(teamTasks.teamId, teamId)));

    // ステータスが変更された場合、履歴を保存
    if (rest.status && rest.status !== existingTask.status) {
      await db.insert(teamTaskStatusHistory).values({
        taskId: id,
        teamId: teamId,
        userId: auth.userId,
        fromStatus: existingTask.status,
        toStatus: rest.status,
        changedAt: Math.floor(Date.now() / 1000),
      });
    }

    // 担当者が変更された場合、通知を作成
    // 条件: 自分以外を担当者に設定した場合のみ
    const newAssigneeId = assigneeId === "" ? null : assigneeId;
    if (
      assigneeId !== undefined &&
      newAssigneeId !== existingTask.assigneeId &&
      newAssigneeId !== null &&
      newAssigneeId !== auth.userId // 自分自身への設定は通知しない
    ) {
      await db.insert(teamNotifications).values({
        teamId,
        userId: newAssigneeId,
        type: "assignee",
        sourceType: "task",
        sourceId: id,
        targetType: "task",
        targetDisplayId: existingTask.displayId,
        boardDisplayId: notificationUrl || null, // URLクエリをそのまま保存
        actorUserId: auth.userId,
        message: `${member.displayName || "誰か"}さんがあなたを担当者に設定しました`,
        isRead: 0,
        createdAt: Date.now(),
      });

      // Slack通知を送信
      await sendAssigneeSlackNotification(
        db,
        c.env,
        teamId,
        newAssigneeId as string,
        member.displayName || "誰か",
        existingTask.title,
        existingTask.displayId,
        notificationUrl,
      );
    }

    // 更新後のタスクを取得して返す
    const assigneeMembers = aliasedTable(teamMembers, "assignee_members");
    const updatedByMembers = aliasedTable(teamMembers, "updated_by_members");

    const updatedTask = await db
      .select({
        ...getTeamTaskSelectFields(),
        assigneeName: assigneeMembers.displayName,
        assigneeAvatarColor: assigneeMembers.avatarColor,
        updatedByName: updatedByMembers.displayName,
        updatedByAvatarColor: updatedByMembers.avatarColor,
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
      .leftJoin(
        updatedByMembers,
        and(
          eq(teamTasks.updatedBy, updatedByMembers.userId),
          eq(teamTasks.teamId, updatedByMembers.teamId),
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
      // deleted_atを設定して論理削除
      await db
        .update(teamTasks)
        .set({
          deletedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(teamTasks.id, id));
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

      await db
        .update(teamTasks)
        .set({
          deletedAt: null,
          updatedAt: currentTimestamp,
        })
        .where(eq(teamTasks.id, taskData.id));

      // 復元されたタスクを作成者情報付きで取得
      const restoredTask = await db
        .select(getTeamTaskSelectFields())
        .from(teamTasks)
        .leftJoin(teamMembers, getTeamTaskMemberJoin())
        .where(eq(teamTasks.id, taskData.id))
        .get();

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

      return c.json({ success: true });
    } catch (error) {
      console.error("チーム削除済みタスク完全削除エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// GET /teams/:teamId/tasks/:id/status-history（チームタスクステータス変更履歴取得）
app.openapi(
  createRoute({
    method: "get",
    path: "/{teamId}/tasks/{id}/status-history",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "Status change history",
        content: {
          "application/json": {
            schema: z.object({
              history: z.array(
                z.object({
                  id: z.number(),
                  fromStatus: z.string().nullable(),
                  toStatus: z.string(),
                  changedAt: z.number(),
                  userId: z.string(),
                  userName: z.string().nullable(),
                  userAvatarColor: z.string().nullable(),
                }),
              ),
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
        description: "Task not found",
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

    // タスクの存在確認
    const task = await db
      .select()
      .from(teamTasks)
      .where(and(eq(teamTasks.id, id), eq(teamTasks.teamId, teamId)))
      .get();

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // 履歴を取得（変更者名付き、新しい順）
    const history = await db
      .select({
        id: teamTaskStatusHistory.id,
        fromStatus: teamTaskStatusHistory.fromStatus,
        toStatus: teamTaskStatusHistory.toStatus,
        changedAt: teamTaskStatusHistory.changedAt,
        userId: teamTaskStatusHistory.userId,
        userName: teamMembers.displayName,
        userAvatarColor: teamMembers.avatarColor,
      })
      .from(teamTaskStatusHistory)
      .leftJoin(
        teamMembers,
        and(
          eq(teamTaskStatusHistory.userId, teamMembers.userId),
          eq(teamTaskStatusHistory.teamId, teamMembers.teamId),
        ),
      )
      .where(
        and(
          eq(teamTaskStatusHistory.taskId, id),
          eq(teamTaskStatusHistory.teamId, teamId),
        ),
      )
      .orderBy(desc(teamTaskStatusHistory.changedAt));

    return c.json({ history }, 200);
  },
);

export default app;
