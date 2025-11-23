import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and } from "drizzle-orm";
import { taggings, tags } from "../../db";
import { teamTaggings, teamTags } from "../../db/schema/team/tags";
import { teamMembers } from "../../db/schema/team/teams";
import type { NewTagging } from "../../db/schema/tags";
import type { DatabaseType, Env, AppType } from "../../types/common";

const TaggingSchema = z.object({
  id: z.number(),
  tagId: z.number(),
  targetType: z.enum(["memo", "task", "board"]),
  targetDisplayId: z.string(), // Phase 6で削除予定
  targetDisplayId: z.string(),
  userId: z.string(),
  createdAt: z.number(),
});

const TaggingWithTagSchema = z.object({
  id: z.number(),
  tagId: z.number(),
  targetType: z.enum(["memo", "task", "board"]),
  targetDisplayId: z.string(), // Phase 6で削除予定
  targetDisplayId: z.string(),
  userId: z.string(),
  createdAt: z.number(),
  tag: z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable(),
  }),
});

const TeamTaggingWithTagSchema = z.object({
  id: z.number(),
  tagId: z.number(),
  targetType: z.enum(["memo", "task", "board"]),
  targetDisplayId: z.string(), // Phase 6で削除予定
  targetDisplayId: z.string(),
  teamId: z.number(),
  userId: z.string(),
  createdAt: z.number(),
  tag: z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable(),
  }),
});

const CreateTaggingSchema = z.object({
  tagId: z.number(),
  targetType: z.enum(["memo", "task", "board"]),
  targetDisplayId: z.string(),
});

export function createAPI(app: AppType) {
  // タグ付け一覧取得
  const getTaggingsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["taggings"],
    request: {
      query: z.object({
        targetType: z.enum(["memo", "task", "board"]).optional(),
        targetDisplayId: z.string().optional(),
        targetDisplayId: z.string().optional(),
        tagId: z.string().optional(),
        includeTag: z.string().optional(),
        teamId: z.string().optional(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(
              z.union([TaggingWithTagSchema, TeamTaggingWithTagSchema]),
            ),
          },
        },
        description: "Get taggings (personal or team)",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
    },
  });

  app.openapi(getTaggingsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const {
      targetType,
      targetDisplayId,
      targetDisplayId,
      tagId,
      includeTag,
      teamId,
    } = c.req.valid("query");
    const db = c.get("db");

    // チームIDが指定された場合はチームタグ付けを取得
    if (teamId) {
      const teamIdNum = parseInt(teamId, 10);
      if (isNaN(teamIdNum)) {
        return c.json({ error: "Invalid teamId" }, 400);
      }

      // チームメンバー確認
      const member = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamIdNum),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (member.length === 0) {
        return c.json({ error: "Not a team member" }, 403);
      }

      // チームタグ付けを取得
      let teamQuery = db
        .select({
          id: teamTaggings.id,
          tagId: teamTaggings.tagId,
          targetType: teamTaggings.targetType,
          targetDisplayId: teamTaggings.targetDisplayId, // Phase 6で削除予定
          targetDisplayId: teamTaggings.targetDisplayId,
          teamId: teamTaggings.teamId,
          userId: teamTaggings.userId,
          createdAt: teamTaggings.createdAt,
          tag: {
            id: teamTags.id,
            name: teamTags.name,
            color: teamTags.color,
          },
        })
        .from(teamTaggings)
        .leftJoin(teamTags, eq(teamTaggings.tagId, teamTags.id))
        .where(eq(teamTaggings.teamId, teamIdNum));

      // チーム用フィルター条件を追加
      if (targetType) {
        teamQuery = teamQuery.where(
          and(
            eq(teamTaggings.teamId, teamIdNum),
            eq(teamTaggings.targetType, targetType),
          ),
        );
      }

      if (targetDisplayId) {
        teamQuery = teamQuery.where(
          and(
            eq(teamTaggings.teamId, teamIdNum),
            eq(teamTaggings.targetDisplayId, targetDisplayId),
          ),
        );
      }

      if (tagId) {
        teamQuery = teamQuery.where(
          and(
            eq(teamTaggings.teamId, teamIdNum),
            eq(teamTaggings.tagId, parseInt(tagId)),
          ),
        );
      }

      // 両方のフィルターがある場合
      if (targetType && targetDisplayId) {
        teamQuery = teamQuery.where(
          and(
            eq(teamTaggings.teamId, teamIdNum),
            eq(teamTaggings.targetType, targetType),
            eq(teamTaggings.targetDisplayId, targetDisplayId),
          ),
        );
      }

      const teamResult = await teamQuery.orderBy(teamTaggings.createdAt);
      return c.json(teamResult);
    }

    // 個人タグ付けの既存ロジック
    let query = db
      .select({
        id: taggings.id,
        tagId: taggings.tagId,
        targetType: taggings.targetType,
        targetDisplayId: taggings.targetDisplayId,
        userId: taggings.userId,
        createdAt: taggings.createdAt,
        tag: {
          id: tags.id,
          name: tags.name,
          color: tags.color,
        },
      })
      .from(taggings)
      .leftJoin(tags, eq(taggings.tagId, tags.id))
      .where(eq(taggings.userId, auth.userId));

    // フィルター条件を追加
    if (targetType) {
      query = query.where(
        and(
          eq(taggings.userId, auth.userId),
          eq(taggings.targetType, targetType),
        ),
      );
    }

    if (targetDisplayId) {
      query = query.where(
        and(
          eq(taggings.userId, auth.userId),
          eq(taggings.targetDisplayId, targetDisplayId),
        ),
      );
    }

    if (tagId) {
      query = query.where(
        and(
          eq(taggings.userId, auth.userId),
          eq(taggings.tagId, parseInt(tagId)),
        ),
      );
    }

    // 両方のフィルターがある場合
    if (targetType && targetDisplayId) {
      query = query.where(
        and(
          eq(taggings.userId, auth.userId),
          eq(taggings.targetType, targetType),
          eq(taggings.targetDisplayId, targetDisplayId),
        ),
      );
    }

    const result = await query.orderBy(taggings.createdAt);
    return c.json(result);
  });

  // タグ付け追加
  const createTaggingRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["taggings"],
    request: {
      query: z.object({
        teamId: z.string().optional(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateTaggingSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: TaggingSchema,
          },
        },
        description: "Tagging created",
      },
      400: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Bad request",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
    },
  });

  app.openapi(createTaggingRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { tagId, targetType, targetDisplayId } = c.req.valid("json");
    const { teamId } = c.req.valid("query");
    const db = c.get("db");

    // チームタグ付けの場合
    if (teamId) {
      const teamIdNum = parseInt(teamId, 10);
      if (isNaN(teamIdNum)) {
        return c.json({ error: "Invalid teamId" }, 400);
      }

      // チームメンバー確認
      const member = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamIdNum),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (member.length === 0) {
        return c.json({ error: "Not a team member" }, 403);
      }

      // チームタグの存在確認
      const teamTag = await db
        .select()
        .from(teamTags)
        .where(and(eq(teamTags.id, tagId), eq(teamTags.teamId, teamIdNum)))
        .limit(1);

      if (teamTag.length === 0) {
        return c.json({ error: "Team tag not found" }, 400);
      }

      // 既に同じチームタグ付けが存在するかチェック
      const existingTeamTagging = await db
        .select()
        .from(teamTaggings)
        .where(
          and(
            eq(teamTaggings.tagId, tagId),
            eq(teamTaggings.targetType, targetType),
            eq(teamTaggings.targetDisplayId, targetDisplayId),
            eq(teamTaggings.teamId, teamIdNum),
          ),
        )
        .limit(1);

      if (existingTeamTagging.length > 0) {
        return c.json({ error: "Team tag already attached to this item" }, 400);
      }

      const newTeamTagging = {
        tagId,
        targetType,
        targetDisplayId: targetDisplayId, // Phase 6で削除予定（displayIdと同じ値）
        targetDisplayId,
        teamId: teamIdNum,
        userId: auth.userId,
        createdAt: new Date(),
      };

      const result = await db
        .insert(teamTaggings)
        .values(newTeamTagging)
        .returning();
      return c.json(result[0], 201);
    }

    // 個人タグ付けの場合（既存のロジック）
    // タグの所有権確認
    const tag = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, auth.userId)))
      .limit(1);

    if (tag.length === 0) {
      return c.json({ error: "Tag not found" }, 400);
    }

    // 既に同じタグ付けが存在するかチェック
    const existing = await db
      .select()
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, targetType),
          eq(taggings.targetDisplayId, targetDisplayId),
          eq(taggings.userId, auth.userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Tag already attached to this item" }, 400);
    }

    const newTagging: NewTagging = {
      tagId,
      targetType,
      targetDisplayId,
      userId: auth.userId,
      createdAt: new Date(),
    };

    const result = await db.insert(taggings).values(newTagging).returning();
    return c.json(result[0], 201);
  });

  // 特定のタグとアイテムの組み合わせでタグ付け削除（先に定義）
  const deleteTaggingByTagRoute = createRoute({
    method: "delete",
    path: "/by-tag",
    tags: ["taggings"],
    request: {
      query: z.object({
        teamId: z.string().optional(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              tagId: z.number(),
              targetType: z.enum(["memo", "task", "board"]),
              targetDisplayId: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Tagging deleted",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  // タグ付け削除（ID指定）
  const deleteTaggingRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["taggings"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Tagging deleted",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  // 特定のタグとアイテムの組み合わせでタグ付け削除（より具体的なので先に定義）
  app.openapi(deleteTaggingByTagRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { tagId, targetType, targetDisplayId } = c.req.valid("json");
    const { teamId } = c.req.valid("query");
    const db = c.get("db");

    // チームタグ付け削除の場合
    if (teamId) {
      const teamIdNum = parseInt(teamId, 10);
      if (isNaN(teamIdNum)) {
        return c.json({ error: "Invalid teamId" }, 400);
      }

      // チームメンバー確認
      const member = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamIdNum),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (member.length === 0) {
        return c.json({ error: "Not a team member" }, 403);
      }

      // チームタグ付けの存在確認
      const teamTagging = await db
        .select()
        .from(teamTaggings)
        .where(
          and(
            eq(teamTaggings.tagId, tagId),
            eq(teamTaggings.targetType, targetType),
            eq(teamTaggings.targetDisplayId, targetDisplayId),
            eq(teamTaggings.teamId, teamIdNum),
          ),
        )
        .limit(1);

      if (teamTagging.length === 0) {
        return c.json({ error: "Team tagging not found" }, 404);
      }

      await db
        .delete(teamTaggings)
        .where(
          and(
            eq(teamTaggings.tagId, tagId),
            eq(teamTaggings.targetType, targetType),
            eq(teamTaggings.targetDisplayId, targetDisplayId),
            eq(teamTaggings.teamId, teamIdNum),
          ),
        );

      return c.json({ success: true });
    }

    // 個人タグ付け削除の場合（既存のロジック）
    // タグ付けの存在確認と所有権確認
    const tagging = await db
      .select()
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, targetType),
          eq(taggings.targetDisplayId, targetDisplayId),
          eq(taggings.userId, auth.userId),
        ),
      )
      .limit(1);

    if (tagging.length === 0) {
      return c.json({ error: "Tagging not found" }, 404);
    }

    const result = await db
      .delete(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, targetType),
          eq(taggings.targetDisplayId, targetDisplayId),
          eq(taggings.userId, auth.userId),
        ),
      );

    return c.json({ success: true });
  });

  // タグ付け削除（ID指定）
  app.openapi(deleteTaggingRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const taggingId = parseInt(c.req.param("id"));
    const db = c.get("db");

    // タグ付けの所有権確認
    const tagging = await db
      .select()
      .from(taggings)
      .where(and(eq(taggings.id, taggingId), eq(taggings.userId, auth.userId)))
      .limit(1);

    if (tagging.length === 0) {
      return c.json({ error: "Tagging not found" }, 404);
    }

    await db.delete(taggings).where(eq(taggings.id, taggingId));

    return c.json({ success: true });
  });

  return app;
}
