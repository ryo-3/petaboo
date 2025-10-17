import { createRoute, z } from "@hono/zod-openapi";
import { eq, asc, and, or, inArray } from "drizzle-orm";
import { getAuth } from "@hono/clerk-auth";
import { teamComments } from "../../db/schema/team/comments";
import { teamMembers } from "../../db/schema/team/teams";
import { teamSlackConfigs } from "../../db/schema/team/slack-configs";
import { boardSlackConfigs } from "../../db/schema/team/board-slack-configs";
import { teamMemos } from "../../db/schema/team/memos";
import { teamTasks } from "../../db/schema/team/tasks";
import { teamBoards, teamBoardItems } from "../../db/schema/team/boards";
import { teamNotifications } from "../../db/schema/team/notifications";
import { teams } from "../../db/schema/team/teams";
import {
  sendSlackNotification,
  formatMentionNotification,
} from "../../utils/slack-notifier";
import { decryptWebhookUrl, hasEncryptionKey } from "../../utils/encryption";
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
  env: any,
) {
  console.log(`🔔 sendMentionNotificationToSlack開始: teamId=${teamId}`);

  // メモ・タスクの場合、ボード所属チェックとボード専用Slack設定の優先確認
  let boardId: number | null = null;
  if (comment.targetType === "memo" || comment.targetType === "task") {
    const boardItems = await db
      .select({ boardId: teamBoardItems.boardId })
      .from(teamBoardItems)
      .where(
        and(
          eq(teamBoardItems.itemType, comment.targetType),
          eq(teamBoardItems.originalId, comment.targetOriginalId),
        ),
      )
      .limit(1);

    if (boardItems.length > 0) {
      boardId = boardItems[0].boardId;
    }
  } else if (comment.targetType === "board") {
    // ボードコメントの場合は直接targetOriginalIdから取得
    const boards = await db
      .select()
      .from(teamBoards)
      .where(
        and(
          eq(teamBoards.teamId, teamId),
          or(
            eq(teamBoards.slug, comment.targetOriginalId),
            eq(teamBoards.id, Number.parseInt(comment.targetOriginalId) || 0),
          ),
        ),
      )
      .limit(1);
    if (boards.length > 0) {
      boardId = boards[0].id;
    }
  }

  // ボードID取得成功時、ボード専用Slack設定を優先確認
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
      console.log(`🎯 ボード専用Slack設定を使用: boardId=${boardId}`);
      slackConfig = boardSlackConfig;
    }
  }

  // ボード専用設定がない場合、チーム全体のSlack設定を使用
  if (slackConfig.length === 0) {
    console.log(`📢 チーム全体Slack設定を使用: teamId=${teamId}`);
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

  console.log(
    `⚙️ Slack設定: ${slackConfig.length > 0 ? "見つかった" : "見つからない"}`,
  );

  if (slackConfig.length === 0) {
    console.log(`⚠️ Slack設定なし or 無効 - 通知スキップ`);
    return; // Slack設定なし or 無効
  }

  // Webhook URLを復号化
  const encryptionKey = env?.ENCRYPTION_KEY;
  let webhookUrl = slackConfig[0].webhookUrl;

  if (encryptionKey && hasEncryptionKey(env)) {
    try {
      webhookUrl = await decryptWebhookUrl(webhookUrl, encryptionKey);
      console.log("🔓 Webhook URL復号化完了");
    } catch (error) {
      console.error("復号化エラー:", error);
      // 復号化失敗時は暗号化されていない可能性（後方互換性）
      console.log("⚠️ 復号化失敗 - 平文として扱います");
    }
  }

  // メンションされたユーザーのdisplayName取得
  let mentionedDisplayNames: string[] = [];

  if (mentionedUserIds.length > 0) {
    const mentionedMembers = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          inArray(teamMembers.userId, mentionedUserIds),
        ),
      );

    mentionedDisplayNames = mentionedMembers.map(
      (m: any) => m.displayName || "Unknown",
    );
  }

  // コメントから情報を取得
  const { targetType, targetOriginalId } = comment;

  // チーム情報を取得（customUrl用）
  const teamData = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  const teamCustomUrl =
    teamData.length > 0 ? teamData[0].customUrl : String(teamId);

  // 対象アイテムのタイトルとURL用の識別子を取得
  let targetTitle = "不明";
  let targetIdentifier = targetOriginalId;
  let boardSlug: string | null = null;

  // メモ・タスクの場合、ボード所属チェック
  if (targetType === "memo" || targetType === "task") {
    // ボードアイテムテーブルから所属ボード情報を取得
    const boardItems = await db
      .select({
        boardId: teamBoardItems.boardId,
        boardSlug: teamBoards.slug,
      })
      .from(teamBoardItems)
      .leftJoin(teamBoards, eq(teamBoards.id, teamBoardItems.boardId))
      .where(
        and(
          eq(teamBoardItems.itemType, targetType),
          eq(teamBoardItems.originalId, targetOriginalId),
        ),
      )
      .limit(1);

    if (boardItems.length > 0) {
      boardSlug = boardItems[0].boardSlug;
    }
  }

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
    if (memos.length > 0) {
      targetTitle = memos[0].title || "無題のメモ";
      targetIdentifier = targetOriginalId; // originalId
    }
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
    if (tasks.length > 0) {
      targetTitle = tasks[0].title || "無題のタスク";
      targetIdentifier = targetOriginalId; // originalId
    }
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
    if (boards.length > 0) {
      targetTitle = boards[0].name || "無題のボード";
      targetIdentifier = boards[0].slug; // slugを使用
    }
  }

  // リンクURL生成（本番環境用）
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:7593";
  let linkUrl: string;

  if (boardSlug && (targetType === "memo" || targetType === "task")) {
    // ボード内のメモ・タスク
    linkUrl = `${appBaseUrl}/team/${teamCustomUrl}/board/${boardSlug}/${targetType}/${targetIdentifier}`;
  } else {
    // ボード外のメモ・タスク、またはボード自体
    linkUrl = `${appBaseUrl}/team/${teamCustomUrl}/${targetType}/${targetIdentifier}`;
  }

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
  const result = await sendSlackNotification(webhookUrl, message);
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
      targetOriginalId: z.string().optional(), // オプションに変更
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
  const whereConditions = [
    eq(teamComments.teamId, teamId),
    eq(teamComments.targetType, targetType),
  ];

  // targetOriginalIdが指定されている場合のみフィルタリング
  if (targetOriginalId) {
    whereConditions.push(eq(teamComments.targetOriginalId, targetOriginalId));
  }

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
    .where(and(...whereConditions))
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

  // チーム全メンバーに通知を作成（投稿者以外）
  const allMembers = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const notificationsToCreate = allMembers
    .filter((m) => m.userId !== auth.userId) // 投稿者自身を除外
    .map((m) => ({
      teamId,
      userId: m.userId,
      type: "comment",
      sourceType: "comment",
      sourceId: result[0].id,
      targetType,
      targetOriginalId,
      actorUserId: auth.userId,
      message: `${member.displayName || "誰か"}さんがコメントしました`,
      isRead: 0,
      createdAt,
    }));

  // 通知を一括作成
  if (notificationsToCreate.length > 0) {
    await db.insert(teamNotifications).values(notificationsToCreate);
  }

  // Slack通知送信（メンションの有無に関わらず送信）
  console.log(`📬 コメント投稿: メンション=${mentionedUserIds.length}人`);
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
      c.env,
    );
  } catch (error) {
    console.error("❌ Slack notification failed:", error);
    // エラーが発生してもコメント投稿は成功として扱う
  }

  return c.json(result[0], 200);
};

// PUT /comments/:id（コメント編集）
export const updateCommentRoute = createRoute({
  method: "put",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            content: z
              .string()
              .min(1)
              .max(1000, "コメントは1,000文字以内で入力してください"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated team comment",
      content: {
        "application/json": {
          schema: TeamCommentSchema,
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
      description: "Forbidden - not the comment owner",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    404: {
      description: "Comment not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const updateComment = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");
  const { content } = c.req.valid("json");

  // コメントを取得して所有者確認
  const existingComments = await db
    .select()
    .from(teamComments)
    .where(eq(teamComments.id, id))
    .limit(1);

  if (existingComments.length === 0) {
    return c.json({ error: "Comment not found" }, 404);
  }

  const existingComment = existingComments[0];

  // 所有者確認
  if (existingComment.userId !== auth.userId) {
    return c.json({ error: "You can only edit your own comments" }, 403);
  }

  // メンション解析
  const mentionedUserIds = await extractMentions(
    content,
    existingComment.teamId,
    db,
  );
  const mentionsJson =
    mentionedUserIds.length > 0 ? JSON.stringify(mentionedUserIds) : null;

  // コメント更新
  const updatedAt = Date.now();
  const result = await db
    .update(teamComments)
    .set({
      content,
      mentions: mentionsJson,
      updatedAt,
    })
    .where(eq(teamComments.id, id))
    .returning();

  return c.json(result[0], 200);
};

// DELETE /comments/:id（コメント削除）
export const deleteCommentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    204: {
      description: "Comment deleted successfully",
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
      description: "Forbidden - not the comment owner",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    404: {
      description: "Comment not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const deleteComment = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");

  // コメントを取得して所有者確認
  const existingComments = await db
    .select()
    .from(teamComments)
    .where(eq(teamComments.id, id))
    .limit(1);

  if (existingComments.length === 0) {
    return c.json({ error: "Comment not found" }, 404);
  }

  const existingComment = existingComments[0];

  // 所有者確認
  if (existingComment.userId !== auth.userId) {
    return c.json({ error: "You can only delete your own comments" }, 403);
  }

  // コメント削除
  await db.delete(teamComments).where(eq(teamComments.id, id));

  return c.body(null, 204);
};

// GET /comments/board-items（ボード内アイテムのコメント一覧取得）
export const getBoardItemCommentsRoute = createRoute({
  method: "get",
  path: "/board-items",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
      boardId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "List of board item comments",
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

export const getBoardItemComments = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId, boardId } = c.req.valid("query");

  // チームメンバー確認
  const member = await checkTeamMember(teamId, auth.userId, db);
  if (!member) {
    return c.json({ error: "Not a team member" }, 403);
  }

  // ボード内のメモ・タスクのoriginalIdを取得
  const boardItems = await db
    .select({
      itemType: teamBoardItems.itemType,
      originalId: teamBoardItems.originalId,
    })
    .from(teamBoardItems)
    .where(eq(teamBoardItems.boardId, boardId));

  if (boardItems.length === 0) {
    return c.json([], 200);
  }

  // メモとタスクのoriginalIdを分離
  const memoOriginalIds = boardItems
    .filter((item) => item.itemType === "memo")
    .map((item) => item.originalId);
  const taskOriginalIds = boardItems
    .filter((item) => item.itemType === "task")
    .map((item) => item.originalId);

  // コメントを取得
  const whereConditions = [eq(teamComments.teamId, teamId)];

  // メモまたはタスクのコメントを取得
  const orConditions = [];
  if (memoOriginalIds.length > 0) {
    orConditions.push(
      and(
        eq(teamComments.targetType, "memo"),
        inArray(teamComments.targetOriginalId, memoOriginalIds),
      ),
    );
  }
  if (taskOriginalIds.length > 0) {
    orConditions.push(
      and(
        eq(teamComments.targetType, "task"),
        inArray(teamComments.targetOriginalId, taskOriginalIds),
      ),
    );
  }

  if (orConditions.length === 0) {
    return c.json([], 200);
  }

  whereConditions.push(or(...orConditions));

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
    .where(and(...whereConditions))
    .orderBy(asc(teamComments.createdAt));

  return c.json(result, 200);
};

export function createAPI(app: OpenAPIHono) {
  app.openapi(getCommentsRoute, getComments);
  app.openapi(postCommentRoute, postComment);
  app.openapi(updateCommentRoute, updateComment);
  app.openapi(deleteCommentRoute, deleteComment);
  app.openapi(getBoardItemCommentsRoute, getBoardItemComments);

  return app;
}
