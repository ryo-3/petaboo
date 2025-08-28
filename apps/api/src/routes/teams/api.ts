import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and } from "drizzle-orm";
import { teams, teamMembers, users } from "../../db";
import { count } from "drizzle-orm";
import type { DatabaseType } from "../../types/common";

// チーム作成のスキーマ
const createTeamSchema = z.object({
  name: z.string().min(1, "チーム名は必須です").max(100, "チーム名は100文字以内にしてください"),
  description: z.string().max(500, "説明は500文字以内にしてください").optional(),
});

// チーム作成ルート定義
export const createTeamRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTeamSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "チーム作成成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            createdAt: z.number(),
          }),
        },
      },
    },
    400: {
      description: "バリデーションエラー",
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// チーム情報取得ルート定義  
export const getMyTeamRoute = createRoute({
  method: "get", 
  path: "/teams/me",
  responses: {
    200: {
      description: "チーム情報取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            role: z.enum(["admin", "member"]),
            createdAt: z.number(),
          }).nullable(),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// 管理者用チーム一覧取得ルート定義
export const getTeamsRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      description: "チーム一覧取得成功",
      content: {
        "application/json": {
          schema: z.object({
            teams: z.array(z.object({
              id: z.number(),
              name: z.string(),
              description: z.string().nullable(),
              memberCount: z.number(),
              createdAt: z.number(),
            })),
            total: z.number(),
          }),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// チーム参加ルート定義
export const joinTeamRoute = createRoute({
  method: "post",
  path: "/{teamId}/join",
  request: {
    params: z.object({
      teamId: z.string().transform(Number),
    }),
  },
  responses: {
    200: {
      description: "チーム参加成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "参加チーム数上限に達しています",
    },
    401: {
      description: "認証が必要です",
    },
    404: {
      description: "チームが見つかりません",
    },
    409: {
      description: "既にチームに参加しています",
    },
  },
  tags: ["Teams"],
});

// チーム作成の実装
export async function createTeam(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;
  const body = await c.req.json();
  
  try {
    // ユーザーのプランをチェック
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);
    
    let userPlan = 'free';
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: 'free',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーはチーム作成不可
    if (userPlan === 'free') {
      return c.json({ error: "チーム作成には有料プランが必要です" }, 403);
    }

    // 有料ユーザーが既にチームを作成しているかチェック
    const existingTeam = await db
      .select()
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(and(
        eq(teamMembers.userId, auth.userId),
        eq(teamMembers.role, "admin")
      ))
      .limit(1);

    if (existingTeam.length > 0) {
      return c.json({ error: "既にチームを作成済みです（有料ユーザーは1チームまで）" }, 403);
    }

    const { name, description } = createTeamSchema.parse(body);
    const now = Math.floor(Date.now() / 1000);

    // チーム作成
    const teamResult = await db
      .insert(teams)
      .values({
        name,
        description: description || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const newTeam = teamResult[0];

    // 作成者を管理者として追加
    await db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: auth.userId,
      role: "admin",
      joinedAt: now,
    });

    return c.json({
      id: newTeam.id,
      name: newTeam.name,
      description: newTeam.description,
      createdAt: newTeam.createdAt,
    }, 201);

  } catch (error) {
    console.error("チーム作成エラー:", error);
    return c.json({ error: "チーム作成に失敗しました" }, 500);
  }
}

// チーム情報取得の実装
export async function getMyTeam(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // ユーザーが所属するチームを取得
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        role: teamMembers.role,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, auth.userId))
      .limit(1);

    if (result.length === 0) {
      return c.json(null, 200);
    }

    return c.json(result[0], 200);

  } catch (error) {
    console.error("チーム情報取得エラー:", error);
    return c.json({ error: "チーム情報の取得に失敗しました" }, 500);
  }
}

// 管理者用チーム一覧取得の実装
export async function getTeams(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // 全チーム一覧とメンバー数を取得
    const teamsWithCount = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        createdAt: teams.createdAt,
        memberCount: count(teamMembers.userId),
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .groupBy(teams.id, teams.name, teams.description, teams.createdAt);

    return c.json({
      teams: teamsWithCount,
      total: teamsWithCount.length,
    }, 200);

  } catch (error) {
    console.error("チーム一覧取得エラー:", error);
    return c.json({ error: "チーム一覧の取得に失敗しました" }, 500);
  }
}

// チーム参加の実装
export async function joinTeam(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const { teamId } = c.req.param();
  const db: DatabaseType = c.env.db;

  try {
    // チームが存在するかチェック
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (team.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    // 既に参加しているかチェック
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, auth.userId)
      ))
      .limit(1);

    if (existingMember.length > 0) {
      return c.json({ error: "既にチームに参加しています" }, 409);
    }

    // ユーザーのプランをチェック
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);
    
    let userPlan = 'free';
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: 'free',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーの参加チーム数制限（3チームまで）
    if (userPlan === 'free') {
      const userTeamCount = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.userId, auth.userId));

      if (userTeamCount[0].count >= 3) {
        return c.json({ error: "参加チーム数の上限に達しています（無料プランは3チームまで）" }, 400);
      }
    }
    // 有料ユーザーは制限なし

    // チームに参加
    const now = Math.floor(Date.now() / 1000);
    await db.insert(teamMembers).values({
      teamId,
      userId: auth.userId,
      role: "member",
      joinedAt: now,
    });

    return c.json({ message: "チームに参加しました" }, 200);

  } catch (error) {
    console.error("チーム参加エラー:", error);
    return c.json({ error: "チーム参加に失敗しました" }, 500);
  }
}