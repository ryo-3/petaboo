import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import {
  teams,
  teamMembers,
  teamBoards,
  teamBoardItems,
  teamDeletedBoards,
  teamMemos,
  teamTasks,
} from "../../db";
import type {
  NewTeamBoard,
  NewTeamBoardItem,
  NewTeamDeletedBoard,
} from "../../db/schema/team/boards";
import type { DatabaseType, Env, AppType } from "../../types/common";

// チーム用ボードAPI関数群を作成
export function createTeamBoardsAPI(app: AppType) {
  // チームボード一覧取得 (status別)
  const getBoardsByStatus = createRoute({
    method: "get",
    path: "/{teamId}/boards",
    request: {
      param: z.object({
        teamId: z.string().openapi({ example: "1" }),
      }),
      query: z.object({
        status: z.enum(["normal", "completed", "deleted"]).openapi({
          example: "normal",
          description: "ボードのステータス",
        }),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(
              z.object({
                id: z.number(),
                name: z.string(),
                slug: z.string(),
                description: z.string().nullable(),
                teamId: z.number(),
                userId: z.string(),
                boardCategoryId: z.number().nullable(),
                archived: z.boolean(),
                completed: z.boolean(),
                createdAt: z.number(),
                updatedAt: z.number(),
              }),
            ),
          },
        },
        description: "チームボード一覧を取得",
      },
    },
  });

  app.openapi(getBoardsByStatus, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId } = c.req.param();
    const { status } = c.req.query();
    const db = c.get("db");

    try {
      // チームメンバーかどうか確認
      const memberCheck = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (memberCheck.length === 0) {
        return c.json({ error: "チームメンバーではありません" }, 403);
      }

      let boardsData;

      if (status === "deleted") {
        // 削除済みボード
        boardsData = await db
          .select()
          .from(teamDeletedBoards)
          .where(eq(teamDeletedBoards.teamId, parseInt(teamId)))
          .orderBy(desc(teamDeletedBoards.deletedAt));
      } else {
        // 通常/完了ボード
        const completedStatus = status === "completed";
        boardsData = await db
          .select()
          .from(teamBoards)
          .where(
            and(
              eq(teamBoards.teamId, parseInt(teamId)),
              eq(teamBoards.completed, completedStatus),
              eq(teamBoards.archived, false),
            ),
          )
          .orderBy(desc(teamBoards.updatedAt));
      }

      return c.json(boardsData);
    } catch (error) {
      console.error("チームボード取得エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボード作成
  const createTeamBoard = createRoute({
    method: "post",
    path: "/{teamId}/boards",
    request: {
      param: z.object({
        teamId: z.string().openapi({ example: "1" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string().openapi({ example: "新しいボード" }),
              slug: z.string().openapi({ example: "new-board" }),
              description: z.string().optional(),
              boardCategoryId: z.number().optional(),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: z.object({
              id: z.number(),
              name: z.string(),
              slug: z.string(),
              description: z.string().nullable(),
              teamId: z.number(),
              userId: z.string(),
              boardCategoryId: z.number().nullable(),
              archived: z.boolean(),
              completed: z.boolean(),
              createdAt: z.number(),
              updatedAt: z.number(),
            }),
          },
        },
        description: "作成されたチームボード",
      },
    },
  });

  app.openapi(createTeamBoard, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId } = c.req.param();
    const { name, slug, description, boardCategoryId } = await c.req.json();
    const db = c.get("db");

    try {
      // チームメンバーかどうか確認
      const memberCheck = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (memberCheck.length === 0) {
        return c.json({ error: "チームメンバーではありません" }, 403);
      }

      const newBoard: NewTeamBoard = {
        name,
        slug,
        description: description || null,
        teamId: parseInt(teamId),
        userId: auth.userId,
        boardCategoryId: boardCategoryId || null,
        archived: false,
        completed: false,
      };

      const result = await db.insert(teamBoards).values(newBoard).returning();
      return c.json(result[0], 201);
    } catch (error) {
      console.error("チームボード作成エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボード詳細取得（slug指定）
  const getTeamBoardBySlug = createRoute({
    method: "get",
    path: "/{teamId}/boards/slug/{slug}",
    request: {
      param: z.object({
        teamId: z.string().openapi({ example: "1" }),
        slug: z.string().openapi({ example: "my-board" }),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              id: z.number(),
              name: z.string(),
              slug: z.string(),
              description: z.string().nullable(),
              teamId: z.number(),
              userId: z.string(),
              boardCategoryId: z.number().nullable(),
              archived: z.boolean(),
              completed: z.boolean(),
              createdAt: z.number(),
              updatedAt: z.number(),
            }),
          },
        },
        description: "チームボード詳細を取得",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "ボードが見つかりません",
      },
    },
  });

  app.openapi(getTeamBoardBySlug, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId, slug } = c.req.param();
    const db = c.get("db");

    try {
      // チームメンバーかどうか確認
      const memberCheck = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (memberCheck.length === 0) {
        return c.json({ error: "チームメンバーではありません" }, 403);
      }

      // ボード検索
      const board = await db
        .select()
        .from(teamBoards)
        .where(
          and(
            eq(teamBoards.teamId, parseInt(teamId)),
            eq(teamBoards.slug, slug),
            eq(teamBoards.archived, false),
          ),
        )
        .limit(1);

      if (board.length === 0) {
        return c.json({ error: "ボードが見つかりません" }, 404);
      }

      return c.json(board[0]);
    } catch (error) {
      console.error("チームボード詳細取得エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボードアイテム一覧取得
  const getTeamBoardItems = createRoute({
    method: "get",
    path: "/{teamId}/boards/{boardId}/items",
    request: {
      param: z.object({
        teamId: z.string().openapi({ example: "1" }),
        boardId: z.string().openapi({ example: "1" }),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              board: z.object({
                id: z.number(),
                name: z.string(),
                slug: z.string(),
                description: z.string().nullable(),
                teamId: z.number(),
                userId: z.string(),
                boardCategoryId: z.number().nullable(),
                archived: z.boolean(),
                completed: z.boolean(),
                createdAt: z.number(),
                updatedAt: z.number(),
              }),
              items: z.array(
                z.object({
                  id: z.number(),
                  boardId: z.number(),
                  itemType: z.enum(["memo", "task"]),
                  itemId: z.number(),
                  position: z.number(),
                  createdAt: z.number(),
                  updatedAt: z.number(),
                  memo: z
                    .object({
                      id: z.number(),
                      title: z.string(),
                      content: z.string(),
                      createdAt: z.number(),
                      updatedAt: z.number(),
                    })
                    .nullable(),
                  task: z
                    .object({
                      id: z.number(),
                      title: z.string(),
                      description: z.string().nullable(),
                      status: z.enum([
                        "not_started",
                        "in_progress",
                        "completed",
                      ]),
                      priority: z.enum(["low", "medium", "high"]),
                      dueDate: z.string().nullable(),
                      createdAt: z.number(),
                      updatedAt: z.number(),
                    })
                    .nullable(),
                }),
              ),
            }),
          },
        },
        description: "チームボードアイテム一覧を取得",
      },
    },
  });

  app.openapi(getTeamBoardItems, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId, boardId } = c.req.param();
    const db = c.get("db");

    try {
      // チームメンバーかどうか確認
      const memberCheck = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (memberCheck.length === 0) {
        return c.json({ error: "チームメンバーではありません" }, 403);
      }

      // ボード情報取得
      const board = await db
        .select()
        .from(teamBoards)
        .where(
          and(
            eq(teamBoards.id, parseInt(boardId)),
            eq(teamBoards.teamId, parseInt(teamId)),
            eq(teamBoards.archived, false),
          ),
        )
        .limit(1);

      if (board.length === 0) {
        return c.json({ error: "ボードが見つかりません" }, 404);
      }

      // ボードアイテム一覧取得（メモ・タスク情報も含む）
      const items = await db
        .select()
        .from(teamBoardItems)
        .leftJoin(
          teamMemos,
          and(
            eq(teamBoardItems.itemType, "memo"),
            eq(teamBoardItems.originalId, teamMemos.originalId),
          ),
        )
        .leftJoin(
          teamTasks,
          and(
            eq(teamBoardItems.itemType, "task"),
            eq(teamBoardItems.originalId, teamTasks.originalId),
          ),
        )
        .where(eq(teamBoardItems.boardId, parseInt(boardId)))
        .orderBy(teamBoardItems.createdAt);

      console.log(
        `📋 Team Board Items API - teamId:${teamId}, boardId:${boardId}, items count:${items.length}`,
      );
      console.log("📋 Board info:", JSON.stringify(board[0], null, 2));

      // フロントエンド用のレスポンス形式に変換（パーソナル用と同じ構造に）
      const formattedItems = items
        .map((item) => ({
          ...item.team_board_items,
          content: item.team_memos
            ? {
                id: item.team_memos.id,
                title: item.team_memos.title,
                content: item.team_memos.content,
                originalId: item.team_memos.originalId,
                createdAt: item.team_memos.createdAt,
                updatedAt: item.team_memos.updatedAt,
              }
            : item.team_tasks
              ? {
                  id: item.team_tasks.id,
                  title: item.team_tasks.title,
                  description: item.team_tasks.description,
                  status: item.team_tasks.status,
                  priority: item.team_tasks.priority,
                  dueDate: item.team_tasks.dueDate,
                  originalId: item.team_tasks.originalId,
                  createdAt: item.team_tasks.createdAt,
                  updatedAt: item.team_tasks.updatedAt,
                }
              : null,
        }))
        .filter((item) => item.content !== null); // contentがnullのアイテムを除外

      console.log(
        `🔍 アイテムフィルタリング結果: ${items.length} → ${formattedItems.length}`,
      );
      console.log(
        "📋 Formatted items preview:",
        formattedItems.slice(0, 2).map((item) => ({
          id: item.id,
          itemType: item.itemType,
          originalId: item.originalId,
          memoTitle: item.memo?.title,
          taskTitle: item.task?.title,
        })),
      );
      console.log(
        "📋 Full formatted item structure:",
        JSON.stringify(formattedItems.slice(0, 1), null, 2),
      );

      return c.json({
        board: board[0],
        items: formattedItems,
      });
    } catch (error) {
      console.error("チームボードアイテム取得エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボード削除済みアイテム取得
  const getTeamBoardDeletedItems = createRoute({
    method: "get",
    path: "/{teamId}/boards/{boardId}/deleted-items",
    request: {
      param: z.object({
        teamId: z.string().openapi({ example: "1" }),
        boardId: z.string().openapi({ example: "1" }),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              board: z.object({
                id: z.number(),
                name: z.string(),
                slug: z.string(),
                description: z.string().nullable(),
                teamId: z.number(),
                userId: z.string(),
                boardCategoryId: z.number().nullable(),
                archived: z.boolean(),
                completed: z.boolean(),
                createdAt: z.number(),
                updatedAt: z.number(),
              }),
              deletedItems: z.array(
                z.object({
                  id: z.number(),
                  itemType: z.enum(["memo", "task"]),
                  itemId: z.number(),
                  deletedAt: z.number(),
                  content: z.any(), // メモまたはタスクの内容
                }),
              ),
            }),
          },
        },
        description: "チームボード削除済みアイテム一覧を取得",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "ボードが見つかりません",
      },
    },
  });

  app.openapi(getTeamBoardDeletedItems, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId, boardId } = c.req.param();
    const db = c.get("db");

    try {
      // チームメンバーかどうか確認
      const memberCheck = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (memberCheck.length === 0) {
        return c.json({ error: "チームメンバーではありません" }, 403);
      }

      // ボード情報取得
      const board = await db
        .select()
        .from(teamBoards)
        .where(
          and(
            eq(teamBoards.id, parseInt(boardId)),
            eq(teamBoards.teamId, parseInt(teamId)),
            eq(teamBoards.archived, false),
          ),
        )
        .limit(1);

      if (board.length === 0) {
        return c.json({ error: "ボードが見つかりません" }, 404);
      }

      // チーム用の削除済みアイテムは現在実装されていないため、空配列を返す
      // 今後必要に応じて teamDeletedBoardItems テーブルを作成して実装する
      const deletedItems: any[] = [];

      return c.json({
        board: board[0],
        deletedItems,
      });
    } catch (error) {
      console.error("チームボード削除済みアイテム取得エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボードアイテム追加
  const addTeamBoardItem = createRoute({
    method: "post",
    path: "/{teamId}/boards/{boardId}/items",
    request: {
      param: z.object({
        teamId: z.string().openapi({ example: "1" }),
        boardId: z.string().openapi({ example: "1" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              itemType: z.enum(["memo", "task"]).openapi({ example: "memo" }),
              itemId: z.string().openapi({ example: "1" }),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: z.object({
              id: z.number(),
              boardId: z.number(),
              itemType: z.enum(["memo", "task"]),
              originalId: z.string(),
              createdAt: z.number(),
            }),
          },
        },
        description: "チームボードアイテム追加成功",
      },
      400: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "不正なリクエスト",
      },
      403: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "チームメンバーではない",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "ボードまたはアイテムが見つからない",
      },
    },
  });

  app.openapi(addTeamBoardItem, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId, boardId } = c.req.param();
    const { itemType, itemId } = await c.req.json();
    const db = c.get("db");

    try {
      // チームメンバーかどうか確認
      const memberCheck = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (memberCheck.length === 0) {
        return c.json({ error: "チームメンバーではありません" }, 403);
      }

      // ボード存在確認
      const board = await db
        .select()
        .from(teamBoards)
        .where(
          and(
            eq(teamBoards.id, parseInt(boardId)),
            eq(teamBoards.teamId, parseInt(teamId)),
            eq(teamBoards.archived, false),
          ),
        )
        .limit(1);

      if (board.length === 0) {
        return c.json({ error: "ボードが見つかりません" }, 404);
      }

      // アイテム存在確認
      let originalId: string;
      if (itemType === "memo") {
        const memo = await db
          .select({ originalId: teamMemos.originalId })
          .from(teamMemos)
          .where(
            and(
              eq(teamMemos.id, parseInt(itemId)),
              eq(teamMemos.teamId, parseInt(teamId)),
            ),
          )
          .limit(1);

        if (memo.length === 0) {
          return c.json({ error: "メモが見つかりません" }, 404);
        }
        originalId = memo[0].originalId;
      } else {
        const task = await db
          .select({ originalId: teamTasks.originalId })
          .from(teamTasks)
          .where(
            and(
              eq(teamTasks.id, parseInt(itemId)),
              eq(teamTasks.teamId, parseInt(teamId)),
            ),
          )
          .limit(1);

        if (task.length === 0) {
          return c.json({ error: "タスクが見つかりません" }, 404);
        }
        originalId = task[0].originalId;
      }

      // 既に追加されているかチェック
      const existingItem = await db
        .select()
        .from(teamBoardItems)
        .where(
          and(
            eq(teamBoardItems.boardId, parseInt(boardId)),
            eq(teamBoardItems.originalId, originalId),
            eq(teamBoardItems.itemType, itemType),
          ),
        )
        .limit(1);

      if (existingItem.length > 0) {
        return c.json({ error: "アイテムは既にボードに追加されています" }, 400);
      }

      // ボードアイテム追加
      const result = await db
        .insert(teamBoardItems)
        .values({
          boardId: parseInt(boardId),
          itemType: itemType,
          originalId: originalId,
        })
        .returning();

      return c.json(result[0], 201);
    } catch (error) {
      console.error("チームボードアイテム追加エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  return app;
}
