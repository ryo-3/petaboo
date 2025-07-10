import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, desc } from "drizzle-orm";
import { boards, boardItems, tasks, notes } from "../../db";
import type { NewBoard, NewBoardItem } from "../../db/schema/boards";

const BoardSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  userId: z.string(),
  position: z.number(),
  archived: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

const BoardItemSchema = z.object({
  id: z.number(),
  boardId: z.number(),
  itemType: z.enum(["memo", "task"]),
  itemId: z.number(),
  position: z.number(),
  createdAt: z.number(),
});

const AddItemToBoardSchema = z.object({
  itemType: z.enum(["memo", "task"]),
  itemId: z.number(),
});

export function createAPI(app: any) {
  // ボード一覧取得
  const getBoardsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["boards"],
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(BoardSchema),
          },
        },
        description: "Get all boards",
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

  app.openapi(getBoardsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = c.env.db;
    const userBoards = await db
      .select()
      .from(boards)
      .where(and(eq(boards.userId, auth.userId), eq(boards.archived, false)))
      .orderBy(boards.position, boards.createdAt);

    return c.json(userBoards);
  });

  // ボード作成
  const createBoardRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["boards"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateBoardSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: BoardSchema,
          },
        },
        description: "Board created",
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

  app.openapi(createBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, description } = c.req.valid("json");
    const db = c.env.db;

    // 最大ポジション取得
    const maxPosition = await db
      .select({ maxPos: boards.position })
      .from(boards)
      .where(eq(boards.userId, auth.userId))
      .orderBy(desc(boards.position))
      .limit(1);

    const newBoard: NewBoard = {
      name,
      description: description || null,
      userId: auth.userId,
      position: (maxPosition[0]?.maxPos || 0) + 1,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(boards).values(newBoard).returning();
    return c.json(result[0], 201);
  });

  // ボード更新
  const updateBoardRoute = createRoute({
    method: "put",
    path: "/{id}",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateBoardSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: BoardSchema,
          },
        },
        description: "Board updated",
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

  app.openapi(updateBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const updateData = c.req.valid("json");
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    const updated = await db
      .update(boards)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(boards.id, boardId))
      .returning();

    return c.json(updated[0]);
  });

  // ボード削除
  const deleteBoardRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["boards"],
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
        description: "Board deleted",
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

  app.openapi(deleteBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // ボードを削除（カスケードでboard_itemsも削除される）
    await db.delete(boards).where(eq(boards.id, boardId));

    return c.json({ success: true });
  });

  // ボード内アイテム取得
  const getBoardItemsRoute = createRoute({
    method: "get",
    path: "/{id}/items",
    tags: ["boards"],
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
              board: BoardSchema,
              items: z.array(z.object({
                id: z.number(),
                itemType: z.enum(["memo", "task"]),
                itemId: z.number(),
                position: z.number(),
                content: z.any(), // メモまたはタスクの内容
              })),
            }),
          },
        },
        description: "Get board with items",
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

  app.openapi(getBoardItemsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // ボードの取得と所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // ボードアイテムの取得
    const items = await db
      .select()
      .from(boardItems)
      .where(eq(boardItems.boardId, boardId))
      .orderBy(boardItems.position);

    // アイテムの内容を取得
    const itemsWithContent = await Promise.all(
      items.map(async (item) => {
        let content;
        if (item.itemType === "memo") {
          const memo = await db
            .select()
            .from(notes)
            .where(and(eq(notes.id, item.itemId), eq(notes.userId, auth.userId)))
            .limit(1);
          content = memo[0] || null;
        } else {
          const task = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.id, item.itemId), eq(tasks.userId, auth.userId)))
            .limit(1);
          content = task[0] || null;
        }

        return {
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          position: item.position,
          content,
        };
      })
    );

    // 削除されたアイテムを除外
    const validItems = itemsWithContent.filter(item => item.content !== null);

    return c.json({
      board: board[0],
      items: validItems,
    });
  });

  // ボードにアイテム追加
  const addItemToBoardRoute = createRoute({
    method: "post",
    path: "/{id}/items",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: AddItemToBoardSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: BoardItemSchema,
          },
        },
        description: "Item added to board",
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

  app.openapi(addItemToBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const { itemType, itemId } = c.req.valid("json");
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // アイテムの存在確認と所有権確認
    if (itemType === "memo") {
      const memo = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, itemId), eq(notes.userId, auth.userId)))
        .limit(1);
      if (memo.length === 0) {
        return c.json({ error: "Memo not found" }, 404);
      }
    } else {
      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, itemId), eq(tasks.userId, auth.userId)))
        .limit(1);
      if (task.length === 0) {
        return c.json({ error: "Task not found" }, 404);
      }
    }

    // 重複チェック
    const existing = await db
      .select()
      .from(boardItems)
      .where(
        and(
          eq(boardItems.boardId, boardId),
          eq(boardItems.itemType, itemType),
          eq(boardItems.itemId, itemId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Item already exists in board" }, 400);
    }

    // 最大ポジション取得
    const maxPosition = await db
      .select({ maxPos: boardItems.position })
      .from(boardItems)
      .where(eq(boardItems.boardId, boardId))
      .orderBy(desc(boardItems.position))
      .limit(1);

    const newItem: NewBoardItem = {
      boardId,
      itemType,
      itemId,
      position: (maxPosition[0]?.maxPos || 0) + 1,
      createdAt: new Date(),
    };

    const result = await db.insert(boardItems).values(newItem).returning();
    return c.json(result[0], 201);
  });

  // ボードからアイテム削除
  const removeItemFromBoardRoute = createRoute({
    method: "delete",
    path: "/{id}/items/{itemId}",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
        itemId: z.string(),
      }),
      query: z.object({
        itemType: z.enum(["memo", "task"]),
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
        description: "Item removed from board",
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

  app.openapi(removeItemFromBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const itemId = parseInt(c.req.param("itemId"));
    const { itemType } = c.req.valid("query");
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // アイテムを削除
    const result = await db
      .delete(boardItems)
      .where(
        and(
          eq(boardItems.boardId, boardId),
          eq(boardItems.itemType, itemType),
          eq(boardItems.itemId, itemId)
        )
      );

    if (result.changes === 0) {
      return c.json({ error: "Item not found in board" }, 404);
    }

    return c.json({ success: true });
  });

  return app;
}