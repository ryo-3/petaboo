import { createRoute, z } from "@hono/zod-openapi";
import { eq, desc, and } from "drizzle-orm";
import { getAuth } from "@hono/clerk-auth";
import { teamComments } from "../../db/schema/team/comments";
import { teamMembers } from "../../db/schema/team/teams";
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
    .orderBy(desc(teamComments.createdAt));

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
      createdAt,
      updatedAt: createdAt,
    })
    .returning();

  return c.json(result[0], 200);
};

export function createAPI(app: OpenAPIHono) {
  app.openapi(getCommentsRoute, getComments);
  app.openapi(postCommentRoute, postComment);

  return app;
}
