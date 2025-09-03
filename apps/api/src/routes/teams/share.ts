import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { teamMemos } from "../../db/schema/team/memos";
import { teamTasks } from "../../db/schema/team/tasks";
import { teams, teamMembers } from "../../db/schema/team/teams";

// SQLite & drizzle セットアップ

const app = new OpenAPIHono();

// オプション認証ミドルウェア（認証エラーでも通す）
app.use("*", async (c, next) => {
  try {
    await clerkMiddleware({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    })(c, next);
  } catch (error) {
    // 認証エラーでも処理を続行
    await next();
  }
});

// 共通スキーマ定義
const SharedMemoSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  teamName: z.string(),
});

const SharedTaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  teamName: z.string(),
});

// チームメンバー確認（任意認証）
async function checkTeamAccess(teamId: number, userId?: string) {
  const team = await db
    .select({
      id: teams.id,
      name: teams.name,
      isPublic: teams.isPublic,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (team.length === 0) {
    return null;
  }

  // パブリックなチームの場合、誰でもアクセス可能
  if (team[0].isPublic) {
    return team[0];
  }

  // プライベートなチームの場合、メンバーのみアクセス可能
  if (!userId) {
    return null;
  }

  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return member.length > 0 ? team[0] : null;
}

// GET /teams/:teamId/share/memo/:uuid（共有メモ取得）
app.openapi(
  createRoute({
    method: "get",
    path: "/{teamId}/share/memo/{uuid}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        uuid: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Shared memo details",
        content: {
          "application/json": {
            schema: SharedMemoSchema,
          },
        },
      },
      403: {
        description: "Access denied",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      404: {
        description: "Memo not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { teamId, uuid } = c.req.valid("param");

    try {
      // 認証情報を取得（任意）
      const auth = getAuth(c);
      const userId = auth?.userId;

      // チームアクセス権限確認
      const team = await checkTeamAccess(teamId, userId);
      if (!team) {
        return c.json({ error: "Access denied" }, 403);
      }

      // メモを取得
      const memo = await db
        .select({
          id: teamMemos.id,
          title: teamMemos.title,
          content: teamMemos.content,
          createdAt: teamMemos.createdAt,
          updatedAt: teamMemos.updatedAt,
        })
        .from(teamMemos)
        .where(and(eq(teamMemos.teamId, teamId), eq(teamMemos.uuid, uuid)))
        .limit(1);

      if (memo.length === 0) {
        return c.json({ error: "Memo not found" }, 404);
      }

      const result = {
        ...memo[0],
        teamName: team.name,
      };

      return c.json(result, 200);
    } catch (error) {
      console.error("Share memo error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// GET /teams/:teamId/share/task/:uuid（共有タスク取得）
app.openapi(
  createRoute({
    method: "get",
    path: "/{teamId}/share/task/{uuid}",
    request: {
      params: z.object({
        teamId: z.string().regex(/^\d+$/).transform(Number),
        uuid: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Shared task details",
        content: {
          "application/json": {
            schema: SharedTaskSchema,
          },
        },
      },
      403: {
        description: "Access denied",
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
    const { teamId, uuid } = c.req.valid("param");

    try {
      // 認証情報を取得（任意）
      const auth = getAuth(c);
      const userId = auth?.userId;

      // チームアクセス権限確認
      const team = await checkTeamAccess(teamId, userId);
      if (!team) {
        return c.json({ error: "Access denied" }, 403);
      }

      // タスクを取得
      const task = await db
        .select({
          id: teamTasks.id,
          title: teamTasks.title,
          description: teamTasks.description,
          status: teamTasks.status,
          priority: teamTasks.priority,
          dueDate: teamTasks.dueDate,
          createdAt: teamTasks.createdAt,
          updatedAt: teamTasks.updatedAt,
        })
        .from(teamTasks)
        .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.uuid, uuid)))
        .limit(1);

      if (task.length === 0) {
        return c.json({ error: "Task not found" }, 404);
      }

      const result = {
        ...task[0],
        teamName: team.name,
      };

      return c.json(result, 200);
    } catch (error) {
      console.error("Share task error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export default app;
