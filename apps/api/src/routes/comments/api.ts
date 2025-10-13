import { createRoute, z } from "@hono/zod-openapi";
import { eq, asc, and, or, inArray } from "drizzle-orm";
import { getAuth } from "@hono/clerk-auth";
import { teamComments } from "../../db/schema/team/comments";
import { teamMembers } from "../../db/schema/team/teams";
import { teamSlackConfigs } from "../../db/schema/team/slack-configs";
import { teamMemos } from "../../db/schema/team/memos";
import { teamTasks } from "../../db/schema/team/tasks";
import { teamBoards } from "../../db/schema/team/boards";
import {
  sendSlackNotification,
  formatMentionNotification,
} from "../../utils/slack-notifier";
import type { OpenAPIHono } from "@hono/zod-openapi";

// 共通スキーマ定義
const TeamCommentSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  userId: z.string(),
  displayName: z.string().nullable(),
  avatarColor: z.string().nullable(),
  targetType: z.enum(["memo", "task", "board"]),
  targetOriginalId: z.string(),
  content: z.string(),
  mentions: z.string().nullable(), // JSON文字列: ["user_xxx", "user_yyy"]
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

const TeamCommentInputSchema = z.object({
  targetType: z.enum(["memo", "task", "board"]),
  targetOriginalId: z.string(),
  content: z
    .string()
    .min(1)
    .max(1000, "コメントは1,000文字以内で入力してください"),
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

// メンション解析のヘルパー関数
// コメント本文から @displayName を抽出し、対応するuserIdの配列を返す
async function extractMentions(
  content: string,
  teamId: number,
  db: any,
): Promise<string[]> {
  // @の後に続く単語を抽出（日本語・英数字・アンダースコア対応）
  const mentionPattern = /@([\p{L}\p{N}_]+)/gu;
  const matches = content.matchAll(mentionPattern);

  const mentionedUserIds = new Set<string>();

  for (const match of matches) {
    const displayName = match[1];

    // チームメンバーからdisplayNameで検索
    const members = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.displayName, displayName),
        ),
      )
      .limit(1);

    if (members.length > 0) {
      mentionedUserIds.add(members[0].userId);
    }
  }

  return Array.from(mentionedUserIds);
}

// Slack通知送信のヘルパー関数
async function sendMentionNotificationToSlack(
  teamId: number,
  mentionedUserIds: string[],
  comment: any,
  commenterDisplayName: string,
  db: any,
) {
  console.log(`🔔 sendMentionNotificationToSlack開始: teamId=${teamId}`);

  // Slack設定取得
  const slackConfig = await db
    .select()
    .from(teamSlackConfigs)
    .where(
      and(
        eq(teamSlackConfigs.teamId, teamId),
        eq(teamSlackConfigs.isEnabled, true),
      ),
    )
    .limit(1);

  console.log(
    `⚙️ Slack設定: ${slackConfig.length > 0 ? "見つかった" : "見つからない"}`,
  );

  if (slackConfig.length === 0) {
    console.log(`⚠️ Slack設定なし or 無効 - 通知スキップ`);
    return; // Slack設定なし or 無効
  }

  // メンションされたユーザーのdisplayName取得
  const mentionedMembers = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        inArray(teamMembers.userId, mentionedUserIds),
      ),
    );

  if (mentionedMembers.length === 0) {
    return; // メンションされたユーザーが見つからない
  }

  const mentionedDisplayNames = mentionedMembers.map(
    (m: any) => m.displayName || "Unknown",
  );

  // 対象アイテムのタイトルを取得
  let targetTitle = "不明";
  const { targetType, targetOriginalId } = comment;

  if (targetType === "memo") {
    const memos = await db
      .select()
      .from(teamMemos)
      .where(
        and(
          eq(teamMemos.teamId, teamId),
          eq(teamMemos.originalId, targetOriginalId),
        ),
      )
      .limit(1);
    if (memos.length > 0) targetTitle = memos[0].title || "無題のメモ";
  } else if (targetType === "task") {
    const tasks = await db
      .select()
      .from(teamTasks)
      .where(
        and(
          eq(teamTasks.teamId, teamId),
          eq(teamTasks.originalId, targetOriginalId),
        ),
      )
      .limit(1);
    if (tasks.length > 0) targetTitle = tasks[0].title || "無題のタスク";
  } else if (targetType === "board") {
    // boardsはoriginalIdがないため、slugまたはidで検索
    const boards = await db
      .select()
      .from(teamBoards)
      .where(
        and(
          eq(teamBoards.teamId, teamId),
          or(
            eq(teamBoards.slug, targetOriginalId),
            eq(teamBoards.id, Number.parseInt(targetOriginalId) || 0),
          ),
        ),
      )
      .limit(1);
    if (boards.length > 0) targetTitle = boards[0].name || "無題のボード";
  }

  // TODO: リンクURLを環境変数から取得
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:7593";
  const linkUrl = `${appBaseUrl}/team/${teamId}/${targetType}/${targetOriginalId}`;

  // 通知メッセージをフォーマット
  const message = formatMentionNotification(
    mentionedDisplayNames,
    commenterDisplayName,
    targetType as "memo" | "task" | "board",
    targetTitle,
    comment.content,
    linkUrl,
  );

  // Slack通知送信
  console.log(`📤 Slack通知送信: ${mentionedDisplayNames.join(", ")}`);
  const result = await sendSlackNotification(
    slackConfig[0].webhookUrl,
    message,
  );
  console.log(
    `✅ Slack通知結果: success=${result.success}, error=${result.error || "なし"}`,
  );
}

// GET /comments（コメント一覧取得）
export const getCommentsRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
      targetType: z.enum(["memo", "task", "board"]),
      targetOriginalId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "List of team comments",
      content: {
        "application/json": {
          schema: z.array(TeamCommentSchema),
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
});

export const getComments = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId, targetType, targetOriginalId } = c.req.valid("query");

  // チームメンバー確認
  const member = await checkTeamMember(teamId, auth.userId, db);
  if (!member) {
    return c.json({ error: "Not a team member" }, 403);
  }

  // コメントとチームメンバー情報をJOINして取得
  const result = await db
    .select({
      id: teamComments.id,
      teamId: teamComments.teamId,
      userId: teamComments.userId,
      displayName: teamMembers.displayName,
      avatarColor: teamMembers.avatarColor,
      targetType: teamComments.targetType,
      targetOriginalId: teamComments.targetOriginalId,
      content: teamComments.content,
      mentions: teamComments.mentions,
      createdAt: teamComments.createdAt,
      updatedAt: teamComments.updatedAt,
    })
    .from(teamComments)
    .leftJoin(
      teamMembers,
      and(
        eq(teamMembers.teamId, teamComments.teamId),
        eq(teamMembers.userId, teamComments.userId),
      ),
    )
    .where(
      and(
        eq(teamComments.teamId, teamId),
        eq(teamComments.targetType, targetType),
        eq(teamComments.targetOriginalId, targetOriginalId),
      ),
    )
    .orderBy(asc(teamComments.createdAt));

  return c.json(result, 200);
};

// POST /comments（コメント投稿）
export const postCommentRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
    }),
    body: {
      content: {
        "application/json": {
          schema: TeamCommentInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Created team comment",
      content: {
        "application/json": {
          schema: TeamCommentSchema,
        },
      },
    },
    400: {
      description: "Invalid input",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            error: z.object({
              issues: z.array(
                z.object({
                  code: z.string(),
                  path: z.array(
                    z.union([z.string(), z.number()]).transform(String),
                  ),
                  message: z.string().optional(),
                }),
              ),
              name: z.string(),
            }),
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
});

export const postComment = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId } = c.req.valid("query");

  // チームメンバー確認
  const member = await checkTeamMember(teamId, auth.userId, db);
  if (!member) {
    return c.json({ error: "Not a team member" }, 403);
  }

  // リクエストボディのバリデーション
  const body = c.req.valid("json");

  const { targetType, targetOriginalId, content } = body;

  // メンション解析
  const mentionedUserIds = await extractMentions(content, teamId, db);
  const mentionsJson =
    mentionedUserIds.length > 0 ? JSON.stringify(mentionedUserIds) : null;

  // コメント作成
  const createdAt = Date.now();
  const result = await db
    .insert(teamComments)
    .values({
      teamId,
      userId: auth.userId,
      targetType,
      targetOriginalId,
      content,
      mentions: mentionsJson,
      createdAt,
      updatedAt: createdAt,
    })
    .returning();

  // Slack通知送信
  console.log(`📬 メンション検出: ${mentionedUserIds.length}人`);
  if (mentionedUserIds.length > 0) {
    console.log(
      `📬 Slack通知送信開始: teamId=${teamId}, mentions=${JSON.stringify(mentionedUserIds)}`,
    );
    const commenterDisplayName = member.displayName || "Unknown";

    // Slack通知を送信（エラーは無視）
    try {
      await sendMentionNotificationToSlack(
        teamId,
        mentionedUserIds,
        result[0],
        commenterDisplayName,
        db,
      );
    } catch (error) {
      console.error("❌ Slack notification failed:", error);
      // エラーが発生してもコメント投稿は成功として扱う
    }
  }

  return c.json(result[0], 200);
};

export function createAPI(app: OpenAPIHono) {
  app.openapi(getCommentsRoute, getComments);
  app.openapi(postCommentRoute, postComment);

  return app;
}
