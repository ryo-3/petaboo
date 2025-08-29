import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, sql } from "drizzle-orm";
import { teams, teamMembers, teamInvitations, users } from "../../db";
import { count } from "drizzle-orm";
import type { DatabaseType } from "../../types/common";

// チーム作成のスキーマ
const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "チーム名は必須です")
    .max(100, "チーム名は100文字以内にしてください"),
  description: z
    .string()
    .max(500, "説明は500文字以内にしてください")
    .optional(),
  customUrl: z
    .string()
    .min(1, "チームURLは必須です")
    .max(30, "チームURLは30文字以内にしてください")
    .regex(
      /^[a-z0-9-]+$/,
      "チームURLは英小文字・数字・ハイフンのみ使用できます",
    )
    .refine(
      (url) =>
        ![
          "admin",
          "api",
          "auth",
          "team",
          "teams",
          "user",
          "users",
          "settings",
          "help",
          "about",
          "contact",
        ].includes(url),
      "このURLは予約されているため使用できません",
    ),
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
            customUrl: z.string(),
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

// 個別チーム詳細取得ルート定義
export const getTeamDetailRoute = createRoute({
  method: "get",
  path: "/{customUrl}",
  request: {
    params: z.object({
      customUrl: z.string(),
    }),
  },
  responses: {
    200: {
      description: "チーム詳細取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            customUrl: z.string(),
            role: z.enum(["admin", "member"]),
            createdAt: z.number(),
            updatedAt: z.number(),
            memberCount: z.number(),
          }),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
    404: {
      description: "チームが見つかりません",
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
          schema: z
            .object({
              id: z.number(),
              name: z.string(),
              description: z.string().nullable(),
              role: z.enum(["admin", "member"]),
              createdAt: z.number(),
            })
            .nullable(),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// ユーザーが所属するチーム一覧取得ルート定義
export const getTeamsRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      description: "チーム一覧取得成功",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              description: z.string().nullable(),
              customUrl: z.string(),
              role: z.enum(["admin", "member"]),
              memberCount: z.number(),
              createdAt: z.number(),
              updatedAt: z.number(),
            }),
          ),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// チーム招待送信ルート定義
export const inviteToTeamRoute = createRoute({
  method: "post",
  path: "/{customUrl}/invite",
  request: {
    params: z.object({
      customUrl: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email("有効なメールアドレスを入力してください"),
            role: z.enum(["admin", "member"]).default("member"),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "招待送信成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            invitationId: z.number(),
          }),
        },
      },
    },
    400: {
      description: "バリデーションエラーまたは既に招待済み",
    },
    401: {
      description: "認証が必要です",
    },
    403: {
      description: "管理者権限が必要です",
    },
    404: {
      description: "チームが見つかりません",
    },
  },
  tags: ["Teams"],
});

// 招待情報取得ルート定義
export const getInvitationRoute = createRoute({
  method: "get",
  path: "/invite/{token}",
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      description: "招待情報取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            teamName: z.string(),
            inviterEmail: z.string(),
            role: z.enum(["admin", "member"]),
            expiresAt: z.number(),
          }),
        },
      },
    },
    404: {
      description: "招待が見つかりません",
    },
  },
  tags: ["Teams"],
});

// 招待受諾ルート定義
export const acceptInvitationRoute = createRoute({
  method: "post",
  path: "/invite/{token}/accept",
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      description: "チーム参加成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            teamId: z.number(),
          }),
        },
      },
    },
    400: {
      description: "参加チーム数上限に達しています",
    },
    404: {
      description: "招待が見つかりません",
    },
    409: {
      description: "既にチームに参加しています",
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

// ユーザーのチーム統計情報取得ルート定義
export const getUserTeamStatsRoute = createRoute({
  method: "get",
  path: "/stats",
  responses: {
    200: {
      description: "チーム統計情報取得成功",
      content: {
        "application/json": {
          schema: z.object({
            ownedTeams: z.number(),
            memberTeams: z.number(),
            maxOwnedTeams: z.number(),
            maxMemberTeams: z.number(),
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

// ユーザーのチーム統計情報取得の実装
export async function getUserTeamStats(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // ユーザーが作成したチーム数を取得
    const ownedTeamsResult = await db
      .select({ count: count() })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(eq(teamMembers.userId, auth.userId), eq(teamMembers.role, "admin")),
      );

    const ownedTeamsCount = ownedTeamsResult[0]?.count || 0;

    // ユーザーが参加している全チーム数を取得
    const allTeamsResult = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.userId, auth.userId));

    const allTeamsCount = allTeamsResult[0]?.count || 0;

    // メンバーとして参加しているチーム数（作成したチーム以外）
    const memberTeamsCount = allTeamsCount - ownedTeamsCount;

    // プレミアムプランの制限値
    const maxOwnedTeams = 3;
    const maxMemberTeams = 3;

    return c.json({
      ownedTeams: ownedTeamsCount,
      memberTeams: memberTeamsCount,
      maxOwnedTeams,
      maxMemberTeams,
    });
  } catch (error) {
    console.error("チーム統計情報取得エラー:", error);
    return c.json({ error: "チーム統計情報の取得に失敗しました" }, 500);
  }
}

// チーム作成の実装
export async function createTeam(c: any) {
  console.log("createTeam関数が呼ばれました");
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;
  const body = await c.req.json();
  console.log("受け取ったbody:", body);

  try {
    // ユーザーのプランをチェック
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);

    let userPlan = "free";
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: "free",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーはチーム作成不可
    if (userPlan === "free") {
      return c.json({ error: "チーム作成には有料プランが必要です" }, 403);
    }

    // プレミアムユーザーのチーム作成数制限チェック
    const ownedTeamsResult = await db
      .select({ count: count() })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(eq(teamMembers.userId, auth.userId), eq(teamMembers.role, "admin")),
      );

    const ownedTeamsCount = ownedTeamsResult[0]?.count || 0;

    if (ownedTeamsCount >= 3) {
      return c.json(
        {
          error:
            "チーム作成数の上限に達しています（プレミアムプランは3チームまで）",
        },
        403,
      );
    }

    console.log("チーム作成リクエストボディ:", body);
    const { name, description, customUrl } = createTeamSchema.parse(body);
    console.log("パース後のデータ:", { name, description, customUrl });
    const now = Math.floor(Date.now() / 1000);

    // customURLの重複チェック
    const existingTeam = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .limit(1);

    if (existingTeam.length > 0) {
      return c.json({ error: "このURLは既に使用されています" }, 400);
    }

    // チーム作成
    const teamResult = await db
      .insert(teams)
      .values({
        name,
        description: description || null,
        customUrl,
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

    return c.json(
      {
        id: newTeam.id,
        name: newTeam.name,
        description: newTeam.description,
        customUrl: newTeam.customUrl,
        createdAt: newTeam.createdAt,
      },
      201,
    );
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

// 個別チーム詳細取得の実装
export async function getTeamDetail(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const customUrl = c.req.param("customUrl");
  const db: DatabaseType = c.env.db;

  console.log("チーム詳細取得リクエスト:", { customUrl, userId: auth.userId });

  try {
    // customUrlからチームIDを取得
    const teamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .limit(1);

    if (teamResult.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    const team = teamResult[0];
    const teamId = team.id;

    // ユーザーがそのチームに所属しているかチェック
    const teamMember = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .limit(1);

    if (teamMember.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    // メンバー数を取得
    const memberCountResult = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    const memberCount = memberCountResult[0]?.count || 0;

    return c.json(
      {
        id: team.id,
        name: team.name,
        description: team.description,
        customUrl: team.customUrl,
        role: teamMember[0].role,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        memberCount,
      },
      200,
    );
  } catch (error) {
    console.error("チーム詳細取得エラー:", error);
    return c.json({ error: "チーム詳細の取得に失敗しました" }, 500);
  }
}

// ユーザーが所属するチーム一覧取得の実装
export async function getTeams(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // ユーザーが所属するチーム一覧を取得
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        customUrl: teams.customUrl,
        role: teamMembers.role,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, auth.userId))
      .orderBy(teams.createdAt);

    // 各チームのメンバー数を取得
    const teamsWithMemberCount = await Promise.all(
      userTeams.map(async (team) => {
        const memberCountResult = await db
          .select({ count: count() })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id));

        return {
          ...team,
          memberCount: memberCountResult[0]?.count || 0,
        };
      }),
    );

    return c.json(teamsWithMemberCount, 200);
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
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
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

    let userPlan = "free";
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: "free",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーの参加チーム数制限（3チームまで）
    if (userPlan === "free") {
      const userTeamCount = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.userId, auth.userId));

      if (userTeamCount[0].count >= 3) {
        return c.json(
          {
            error:
              "参加チーム数の上限に達しています（無料プランは3チームまで）",
          },
          400,
        );
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

// チーム招待送信の実装
export async function inviteToTeam(c: any) {
  const customUrl = c.req.param("customUrl");
  console.log("招待送信開始:", { customUrl });

  const auth = getAuth(c);
  if (!auth?.userId) {
    console.log("認証エラー: ユーザーが認証されていません");
    return c.json({ error: "認証が必要です" }, 401);
  }

  const requestBody = await c.req.json();
  const { email, role = "member" } = requestBody;
  const db: DatabaseType = c.env.db;

  try {
    // customUrlからチームIDを取得
    const teamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .limit(1);

    if (teamResult.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    const team = teamResult[0];
    const teamId = team.id;

    console.log("招待送信リクエスト:", {
      teamId,
      customUrl,
      email,
      role,
      userId: auth.userId,
    });

    // ユーザーがそのチームの管理者かチェック
    const teamMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
          eq(teamMembers.role, "admin"),
        ),
      )
      .limit(1);

    if (teamMember.length === 0) {
      return c.json({ error: "管理者権限が必要です" }, 403);
    }

    // 既に招待済みかチェック
    console.log("既存招待チェック開始");
    const existingInvitation = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, teamId),
          eq(teamInvitations.email, email),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .limit(1);

    console.log("既存招待チェック結果:", {
      count: existingInvitation.length,
      invitations: existingInvitation,
    });

    if (existingInvitation.length > 0) {
      console.log("既存招待エラー: 重複招待です");
      return c.json(
        { error: "このメールアドレスには既に招待を送信済みです" },
        400,
      );
    }

    // 既にチームメンバーかチェック（メールアドレスでユーザー検索は今回はスキップ）

    // 招待トークンを生成（簡単な実装）
    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7 * 24 * 60 * 60; // 7日後

    // 招待をDBに保存
    const invitation = await db
      .insert(teamInvitations)
      .values({
        teamId,
        email,
        role,
        token,
        invitedBy: auth.userId,
        createdAt: now,
        expiresAt,
        status: "pending",
      })
      .returning();

    // メール送信（失敗しても続行）
    const invitationLink = `http://localhost:7593/team/join/${token}`;

    try {
      const { sendTeamInvitationEmail } = await import(
        "../../services/email.js"
      );
      const emailResult = await sendTeamInvitationEmail({
        to: email,
        teamName: team[0].name,
        inviterEmail: auth.userId,
        role,
        invitationToken: token,
        invitationLink,
      });

      console.log(`招待メール送信結果:`, emailResult.success ? "成功" : "失敗");
    } catch (error) {
      console.error("メール送信でエラー:", error);
    }

    console.log(`招待作成完了: ${email} をチーム「${team.name}」に招待`);
    console.log(`招待リンク: ${invitationLink}`);

    return c.json(
      {
        message: "招待を送信しました",
        invitationId: invitation[0].id,
        invitationLink,
      },
      201,
    );
  } catch (error) {
    console.error("チーム招待エラー:", error);
    return c.json({ error: "招待送信に失敗しました" }, 500);
  }
}

// 招待情報取得の実装
export async function getInvitation(c: any) {
  const token = c.req.param("token");
  const db: DatabaseType = c.env.db;

  try {
    // 招待情報を取得
    const invitation = await db
      .select({
        id: teamInvitations.id,
        teamId: teamInvitations.teamId,
        email: teamInvitations.email,
        role: teamInvitations.role,
        invitedBy: teamInvitations.invitedBy,
        expiresAt: teamInvitations.expiresAt,
        status: teamInvitations.status,
        teamName: teams.name,
      })
      .from(teamInvitations)
      .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
      .where(
        and(
          eq(teamInvitations.token, token),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .get();

    if (!invitation) {
      return c.json({ message: "招待が見つかりません" }, 404);
    }

    // 期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (invitation.expiresAt < now) {
      // 期限切れの場合はステータスを更新
      await db
        .update(teamInvitations)
        .set({ status: "expired" })
        .where(eq(teamInvitations.token, token));

      return c.json({ message: "招待の期限が切れています" }, 404);
    }

    return c.json({
      id: invitation.teamId,
      teamName: invitation.teamName,
      inviterEmail: invitation.invitedBy,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("招待情報取得エラー:", error);
    return c.json({ message: "招待情報の取得に失敗しました" }, 500);
  }
}

// 招待受諾の実装
export async function acceptInvitation(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "認証が必要です" }, 401);
  }

  const token = c.req.param("token");
  const db: DatabaseType = c.env.db;

  try {
    // 招待情報を取得
    const invitation = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.token, token),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .get();

    if (!invitation) {
      return c.json({ message: "招待が見つかりません" }, 404);
    }

    // 期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (invitation.expiresAt < now) {
      await db
        .update(teamInvitations)
        .set({ status: "expired" })
        .where(eq(teamInvitations.token, token));

      return c.json({ message: "招待の期限が切れています" }, 404);
    }

    // 既にチームメンバーかチェック
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, invitation.teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (existingMember) {
      return c.json({ message: "既にこのチームに参加しています" }, 409);
    }

    // プレミアムプラン制限チェック
    const memberTeamsCount = await db
      .select({ count: sql`count(*)`.as("count") })
      .from(teamMembers)
      .where(eq(teamMembers.userId, auth.userId))
      .get();

    const MAX_MEMBER_TEAMS = 3;
    if (memberTeamsCount && memberTeamsCount.count >= MAX_MEMBER_TEAMS) {
      return c.json({ message: "参加できるチーム数の上限に達しています" }, 400);
    }

    // チームメンバーとして追加
    await db.insert(teamMembers).values({
      teamId: invitation.teamId,
      userId: auth.userId,
      role: invitation.role,
      joinedAt: Math.floor(Date.now() / 1000),
    });

    // 招待ステータスを受諾済みに更新
    await db
      .update(teamInvitations)
      .set({ status: "accepted" })
      .where(eq(teamInvitations.token, token));

    return c.json({
      message: "チームに参加しました",
      teamId: invitation.teamId,
    });
  } catch (error) {
    console.error("招待受諾エラー:", error);
    return c.json({ message: "チームへの参加に失敗しました" }, 500);
  }
}
