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
        .select({
          id: teamBoardItems.id,
          boardId: teamBoardItems.boardId,
          itemType: teamBoardItems.itemType,
          itemId: teamBoardItems.itemId,
          position: teamBoardItems.position,
          createdAt: teamBoardItems.createdAt,
          updatedAt: teamBoardItems.updatedAt,
          memo: {
            id: teamMemos.id,
            title: teamMemos.title,
            content: teamMemos.content,
            createdAt: teamMemos.createdAt,
            updatedAt: teamMemos.updatedAt,
          },
          task: {
            id: teamTasks.id,
            title: teamTasks.title,
            description: teamTasks.description,
            status: teamTasks.status,
            priority: teamTasks.priority,
            dueDate: teamTasks.dueDate,
            createdAt: teamTasks.createdAt,
            updatedAt: teamTasks.updatedAt,
          },
        })
        .from(teamBoardItems)
        .leftJoin(
          teamMemos,
          and(
            eq(teamBoardItems.itemType, "memo"),
            eq(teamBoardItems.itemId, teamMemos.id),
          ),
        )
        .leftJoin(
          teamTasks,
          and(
            eq(teamBoardItems.itemType, "task"),
            eq(teamBoardItems.itemId, teamTasks.id),
          ),
        )
        .where(eq(teamBoardItems.boardId, parseInt(boardId)))
        .orderBy(teamBoardItems.position);

      return c.json({
        board: board[0],
        items,
      });
    } catch (error) {
      console.error("チームボードアイテム取得エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  return app;
}
