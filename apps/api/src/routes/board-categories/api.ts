import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, sql, like } from "drizzle-orm";
import { boardCategories, boards } from "../../db";
import type { NewBoardCategory } from "../../db/schema/board-categories";
import type { DatabaseType, Env, AppType } from "../../types/common";

const BoardCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
  userId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const CreateBoardCategorySchema = z.object({
  name: z.string().min(1).max(50),
  boardId: z.number(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
});

const BoardCategoryStatsSchema = z.object({
  id: z.number(),
  name: z.string(),
  boardCount: z.number(),
  archivedBoards: z.number(),
  completedBoards: z.number(),
});

const ReorderCategoriesSchema = z.object({
  categoryIds: z.array(z.number()),
});

export function createAPI(app: AppType) {
  // ボードカテゴリー一覧取得
  const getBoardCategoriesRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["board-categories"],
    request: {
      query: z.object({
        boardId: z.string().optional(),
        q: z.string().optional(),
        sort: z.enum(["name", "usage", "order"]).optional().default("order"),
        limit: z.string().optional(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(BoardCategorySchema),
          },
        },
        description: "Get all board categories",
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

  app.openapi(getBoardCategoriesRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { boardId, q, sort, limit } = c.req.valid("query");
    const db = c.env.db;

    let query = db
      .select()
      .from(boardCategories)
      .where(eq(boardCategories.userId, auth.userId));

    // ボードIDでフィルタリング
    if (boardId) {
      query = query.where(
        and(
          eq(boardCategories.userId, auth.userId),
          eq(boardCategories.boardId, parseInt(boardId)),
        ),
      );
    }

    // 検索フィルター
    if (q) {
      query = query.where(
        and(
          eq(boardCategories.userId, auth.userId),
          like(boardCategories.name, `%${q}%`),
        ),
      );
    }

    // ソート順
    if (sort === "usage") {
      // 使用頻度順（ボード数でソート）
      const categoriesWithUsage = await db
        .select({
          id: boardCategories.id,
          name: boardCategories.name,
          description: boardCategories.description,
          color: boardCategories.color,
          icon: boardCategories.icon,
          sortOrder: boardCategories.sortOrder,
          userId: boardCategories.userId,
          createdAt: boardCategories.createdAt,
          updatedAt: boardCategories.updatedAt,
          boardCount: sql<number>`count(${boards.id})`,
        })
        .from(boardCategories)
        .leftJoin(boards, eq(boardCategories.id, boards.boardCategoryId))
        .where(eq(boardCategories.userId, auth.userId))
        .groupBy(boardCategories.id)
        .orderBy(sql<number>`count(${boards.id}) DESC`);

      const limitValue = limit ? parseInt(limit) : undefined;
      const result = limitValue
        ? categoriesWithUsage.slice(0, limitValue)
        : categoriesWithUsage;

      return c.json(
        result.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          color: item.color,
          icon: item.icon,
          sortOrder: item.sortOrder,
          userId: item.userId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      );
    } else if (sort === "name") {
      // 名前順
      query = query.orderBy(boardCategories.name);
    } else {
      // 並び順（デフォルト）
      query = query.orderBy(boardCategories.sortOrder, boardCategories.name);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const result = await query;
    return c.json(result);
  });

  // ボードカテゴリー作成
  const createBoardCategoryRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["board-categories"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateBoardCategorySchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: BoardCategorySchema,
          },
        },
        description: "Board category created",
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

  app.openapi(createBoardCategoryRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, boardId, description, color, icon, sortOrder } =
      c.req.valid("json");
    const db = c.env.db;

    // カテゴリー数制限チェック（30個）
    const categoryCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(boardCategories)
      .where(eq(boardCategories.userId, auth.userId));

    if (categoryCount[0]?.count >= 30) {
      return c.json(
        { error: "Board category limit reached (30 categories maximum)" },
        400,
      );
    }

    // 同名カテゴリーの存在チェック
    const existing = await db
      .select()
      .from(boardCategories)
      .where(
        and(
          eq(boardCategories.userId, auth.userId),
          eq(boardCategories.name, name),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Board category already exists" }, 400);
    }

    // sortOrderが指定されていない場合は最大値+1を設定
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxSortOrder = await db
        .select({ max: sql<number>`max(${boardCategories.sortOrder})` })
        .from(boardCategories)
        .where(eq(boardCategories.userId, auth.userId));

      finalSortOrder = (maxSortOrder[0]?.max || 0) + 1;
    }

    const newCategory: NewBoardCategory = {
      name,
      boardId,
      description: description || null,
      color: color || null,
      icon: icon || null,
      sortOrder: finalSortOrder,
      userId: auth.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .insert(boardCategories)
      .values(newCategory)
      .returning();
    return c.json(result[0], 201);
  });

  // ボードカテゴリー更新
  const updateBoardCategoryRoute = createRoute({
    method: "put",
    path: "/{id}",
    tags: ["board-categories"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateBoardCategorySchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: BoardCategorySchema,
          },
        },
        description: "Board category updated",
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

  app.openapi(updateBoardCategoryRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = parseInt(c.req.param("id"));
    const { name, description, color, icon, sortOrder } = c.req.valid("json");
    const db = c.env.db;

    // カテゴリーの所有権確認
    const category = await db
      .select()
      .from(boardCategories)
      .where(
        and(
          eq(boardCategories.id, categoryId),
          eq(boardCategories.userId, auth.userId),
        ),
      )
      .limit(1);

    if (category.length === 0) {
      return c.json({ error: "Board category not found" }, 404);
    }

    // 同名カテゴリーの存在チェック（自分以外）
    const existing = await db
      .select()
      .from(boardCategories)
      .where(
        and(
          eq(boardCategories.userId, auth.userId),
          eq(boardCategories.name, name),
          sql`${boardCategories.id} != ${categoryId}`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Board category already exists" }, 400);
    }

    const updated = await db
      .update(boardCategories)
      .set({
        name,
        description: description || null,
        color: color || null,
        icon: icon || null,
        sortOrder: sortOrder !== undefined ? sortOrder : category[0].sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(boardCategories.id, categoryId))
      .returning();

    return c.json(updated[0]);
  });

  // ボードカテゴリー削除
  const deleteBoardCategoryRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["board-categories"],
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
        description: "Board category deleted",
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

  app.openapi(deleteBoardCategoryRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // カテゴリーの所有権確認
    const category = await db
      .select()
      .from(boardCategories)
      .where(
        and(
          eq(boardCategories.id, categoryId),
          eq(boardCategories.userId, auth.userId),
        ),
      )
      .limit(1);

    if (category.length === 0) {
      return c.json({ error: "Board category not found" }, 404);
    }

    // カテゴリーを削除（関連するボードのboardCategoryIdはNULLになる）
    await db.delete(boardCategories).where(eq(boardCategories.id, categoryId));

    return c.json({ success: true });
  });

  // カテゴリー並び替え
  const reorderCategoriesRoute = createRoute({
    method: "put",
    path: "/reorder",
    tags: ["board-categories"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: ReorderCategoriesSchema,
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
        description: "Categories reordered",
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

  app.openapi(reorderCategoriesRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { categoryIds } = c.req.valid("json");
    const db = c.env.db;

    // すべてのカテゴリーが存在し、ユーザーの所有であることを確認
    const categories = await db
      .select()
      .from(boardCategories)
      .where(eq(boardCategories.userId, auth.userId));

    const userCategoryIds = categories.map((cat) => cat.id);
    const invalidIds = categoryIds.filter(
      (id) => !userCategoryIds.includes(id),
    );

    if (invalidIds.length > 0) {
      return c.json({ error: "Invalid category IDs" }, 400);
    }

    // 並び順を更新
    for (let i = 0; i < categoryIds.length; i++) {
      await db
        .update(boardCategories)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(boardCategories.id, categoryIds[i]));
    }

    return c.json({ success: true });
  });

  // ボードカテゴリー統計情報取得
  const getBoardCategoryStatsRoute = createRoute({
    method: "get",
    path: "/{id}/stats",
    tags: ["board-categories"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: BoardCategoryStatsSchema,
          },
        },
        description: "Board category statistics",
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

  app.openapi(getBoardCategoryStatsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // カテゴリーの所有権確認
    const category = await db
      .select()
      .from(boardCategories)
      .where(
        and(
          eq(boardCategories.id, categoryId),
          eq(boardCategories.userId, auth.userId),
        ),
      )
      .limit(1);

    if (category.length === 0) {
      return c.json({ error: "Board category not found" }, 404);
    }

    // 総ボード数
    const boardCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(boards)
      .where(
        and(
          eq(boards.userId, auth.userId),
          eq(boards.boardCategoryId, categoryId),
        ),
      );

    // アーカイブ済みボード数
    const archivedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(boards)
      .where(
        and(
          eq(boards.userId, auth.userId),
          eq(boards.boardCategoryId, categoryId),
          eq(boards.archived, true),
        ),
      );

    // 完了済みボード数
    const completedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(boards)
      .where(
        and(
          eq(boards.userId, auth.userId),
          eq(boards.boardCategoryId, categoryId),
          eq(boards.completed, true),
        ),
      );

    return c.json({
      id: categoryId,
      name: category[0].name,
      boardCount: boardCount[0]?.count || 0,
      archivedBoards: archivedCount[0]?.count || 0,
      completedBoards: completedCount[0]?.count || 0,
    });
  });

  return app;
}
