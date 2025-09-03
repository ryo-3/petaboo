import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, sql } from "drizzle-orm";
import { categories, tasks, memos } from "../../db";
import type { NewCategory } from "../../db/schema/categories";
import type { DatabaseType, Env, AppType } from "../../types/common";

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  userId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(50),
});

const CategoryUsageSchema = z.object({
  categoryId: z.number(),
  taskCount: z.number(),
  memoCount: z.number(),
  boardCount: z.number(),
});

export function createAPI(app: AppType) {
  // カテゴリー一覧取得
  const getCategoriesRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["categories"],
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(CategorySchema),
          },
        },
        description: "Get all categories",
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

  app.openapi(getCategoriesRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = c.get("db");
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, auth.userId))
      .orderBy(categories.name);

    return c.json(userCategories);
  });

  // カテゴリー作成
  const createCategoryRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["categories"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateCategorySchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: CategorySchema,
          },
        },
        description: "Category created",
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

  app.openapi(createCategoryRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name } = c.req.valid("json");
    const db = c.get("db");

    // 同名カテゴリーの存在チェック
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, auth.userId), eq(categories.name, name)))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Category already exists" }, 400);
    }

    const newCategory: NewCategory = {
      name,
      userId: auth.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(categories).values(newCategory).returning();
    return c.json(result[0], 201);
  });

  // カテゴリー更新
  const updateCategoryRoute = createRoute({
    method: "put",
    path: "/{id}",
    tags: ["categories"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateCategorySchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: CategorySchema,
          },
        },
        description: "Category updated",
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

  app.openapi(updateCategoryRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = parseInt(c.req.param("id"));
    const { name } = c.req.valid("json");
    const db = c.get("db");

    // カテゴリーの所有権確認
    const category = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.userId, auth.userId)),
      )
      .limit(1);

    if (category.length === 0) {
      return c.json({ error: "Category not found" }, 404);
    }

    // 同名カテゴリーの存在チェック（自分以外）
    const existing = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, auth.userId),
          eq(categories.name, name),
          sql`${categories.id} != ${categoryId}`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Category already exists" }, 400);
    }

    const updated = await db
      .update(categories)
      .set({ name, updatedAt: new Date() })
      .where(eq(categories.id, categoryId))
      .returning();

    return c.json(updated[0]);
  });

  // カテゴリー削除
  const deleteCategoryRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["categories"],
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
        description: "Category deleted",
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

  app.openapi(deleteCategoryRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = parseInt(c.req.param("id"));
    const db = c.get("db");

    // カテゴリーの所有権確認
    const category = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.userId, auth.userId)),
      )
      .limit(1);

    if (category.length === 0) {
      return c.json({ error: "Category not found" }, 404);
    }

    // カテゴリーを削除（関連するタスク・メモのcategoryIdはNULLになる）
    await db.delete(categories).where(eq(categories.id, categoryId));

    return c.json({ success: true });
  });

  // カテゴリー使用状況取得
  const getCategoryUsageRoute = createRoute({
    method: "get",
    path: "/{id}/usage",
    tags: ["categories"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: CategoryUsageSchema,
          },
        },
        description: "Category usage",
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

  app.openapi(getCategoryUsageRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = parseInt(c.req.param("id"));
    const db = c.get("db");

    // カテゴリーの所有権確認
    const category = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.userId, auth.userId)),
      )
      .limit(1);

    if (category.length === 0) {
      return c.json({ error: "Category not found" }, 404);
    }

    // タスクの使用数をカウント
    const taskCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(eq(tasks.userId, auth.userId), eq(tasks.categoryId, categoryId)),
      );

    // メモの使用数をカウント
    const memoCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(memos)
      .where(
        and(eq(memos.userId, auth.userId), eq(memos.categoryId, categoryId)),
      );

    return c.json({
      categoryId,
      taskCount: taskCount[0]?.count || 0,
      memoCount: memoCount[0]?.count || 0,
      boardCount: 0, // 将来実装
    });
  });

  return app;
}
