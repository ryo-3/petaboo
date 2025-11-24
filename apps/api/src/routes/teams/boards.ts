import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, or, desc, isNull, isNotNull, sql } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm/alias";
import {
  teams,
  teamMembers,
  teamBoards,
  teamBoardItems,
  teamMemos,
  teamTasks,
  teamDeletedMemos,
  teamDeletedTasks,
  teamComments,
} from "../../db";
import type {
  NewTeamBoard,
  NewTeamBoardItem,
} from "../../db/schema/team/boards";
import type { DatabaseType, Env, AppType } from "../../types/common";

// チーム用ボードAPI関数群を作成
export function createTeamBoardsAPI(app: AppType) {
  // チームボード一覧取得 (status別)
  const getBoardsByStatus = createRoute({
    method: "get",
    path: "/{teamId}/boards",
    request: {
      params: z.object({
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
                memoCount: z.number(),
                taskCount: z.number(),
                commentCount: z.number(),
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
        // 削除済みボードは管理しない（空配列を返す）
        boardsData = [];
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

      // 各ボードのメモ・タスク数を計算
      const boardsWithStats = await Promise.all(
        boardsData.map(async (board) => {
          // ボードアイテムを取得
          const items = await db
            .select()
            .from(teamBoardItems)
            .where(eq(teamBoardItems.boardId, board.id));

          // メモとタスクの数をカウント
          let memoCount = 0;
          let taskCount = 0;
          const memoDisplayIds: string[] = [];
          const taskDisplayIds: string[] = [];

          for (const item of items) {
            if (item.itemType === "memo") {
              // チームメモが削除されていないか確認
              const memo = await db
                .select()
                .from(teamMemos)
                .where(
                  and(
                    eq(teamMemos.displayId, item.displayId),
                    eq(teamMemos.teamId, parseInt(teamId)),
                  ),
                )
                .limit(1);
              if (memo.length > 0) {
                memoCount++;
                memoDisplayIds.push(item.displayId);
              }
            } else {
              // チームタスクが削除されていないか確認
              const task = await db
                .select()
                .from(teamTasks)
                .where(
                  and(
                    eq(teamTasks.displayId, item.displayId),
                    eq(teamTasks.teamId, parseInt(teamId)),
                  ),
                )
                .limit(1);
              if (task.length > 0) {
                taskCount++;
                taskDisplayIds.push(item.displayId);
              }
            }
          }

          // ボードに紐づくコメント数を集計
          let commentCount = 0;

          // ボード自体へのコメント
          const boardComments = await db
            .select()
            .from(teamComments)
            .where(
              and(
                eq(teamComments.teamId, parseInt(teamId)),
                eq(teamComments.targetType, "board"),
                eq(teamComments.targetDisplayId, board.id.toString()),
              ),
            );
          commentCount += boardComments.length;

          // ボード内のメモへのコメント
          if (memoDisplayIds.length > 0) {
            const memoComments = await db
              .select()
              .from(teamComments)
              .where(
                and(
                  eq(teamComments.teamId, parseInt(teamId)),
                  eq(teamComments.targetType, "memo"),
                  or(
                    ...memoDisplayIds.map((id: string) =>
                      eq(teamComments.targetDisplayId, id),
                    ),
                  ),
                ),
              );
            commentCount += memoComments.length;
          }

          // ボード内のタスクへのコメント
          if (taskDisplayIds.length > 0) {
            const taskComments = await db
              .select()
              .from(teamComments)
              .where(
                and(
                  eq(teamComments.teamId, parseInt(teamId)),
                  eq(teamComments.targetType, "task"),
                  or(
                    ...taskDisplayIds.map((id: string) =>
                      eq(teamComments.targetDisplayId, id),
                    ),
                  ),
                ),
              );
            commentCount += taskComments.length;
          }

          return {
            ...board,
            memoCount,
            taskCount,
            commentCount,
          };
        }),
      );

      return c.json(boardsWithStats);
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
      params: z.object({
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
              memoCount: z.number(),
              taskCount: z.number(),
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
      // 新規ボードなのでメモ・タスクカウントは0
      return c.json({ ...result[0], memoCount: 0, taskCount: 0 }, 201);
    } catch (error) {
      console.error("チームボード作成エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボード更新
  const updateTeamBoard = createRoute({
    method: "put",
    path: "/{teamId}/boards/{id}",
    request: {
      params: z.object({
        teamId: z.string().openapi({ example: "1" }),
        id: z.string().openapi({ example: "1" }),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string().optional(),
              description: z.string().optional(),
              slug: z
                .string()
                .regex(
                  /^[a-z0-9-]+$/,
                  "Slug must contain only lowercase letters, numbers, and hyphens",
                )
                .min(1)
                .max(50)
                .optional(),
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
        description: "更新されたチームボード",
      },
    },
  });

  app.openapi(updateTeamBoard, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId, id } = c.req.param();
    const { name, description, slug } = await c.req.json();
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

      // ボードの存在確認
      const existingBoard = await db
        .select()
        .from(teamBoards)
        .where(
          and(
            eq(teamBoards.id, parseInt(id)),
            eq(teamBoards.teamId, parseInt(teamId)),
          ),
        )
        .limit(1);

      if (existingBoard.length === 0) {
        return c.json({ error: "ボードが見つかりません" }, 404);
      }

      // slugが指定されている場合は重複チェック
      if (slug) {
        const duplicateBoard = await db
          .select()
          .from(teamBoards)
          .where(
            and(
              eq(teamBoards.slug, slug),
              eq(teamBoards.teamId, parseInt(teamId)),
            ),
          )
          .limit(1);

        // 自分以外のボードで同じslugが存在する場合はエラー
        if (
          duplicateBoard.length > 0 &&
          duplicateBoard[0].id !== parseInt(id)
        ) {
          return c.json({ error: "このスラッグは既に使用されています" }, 400);
        }
      }

      // 更新データの準備
      const updateData: Partial<NewTeamBoard> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        updateData.name = name;
      }

      if (description !== undefined) {
        updateData.description = description || null;
      }

      if (slug !== undefined) {
        updateData.slug = slug;
      }

      // ボード更新
      const result = await db
        .update(teamBoards)
        .set(updateData)
        .where(
          and(
            eq(teamBoards.id, parseInt(id)),
            eq(teamBoards.teamId, parseInt(teamId)),
          ),
        )
        .returning();

      return c.json(result[0], 200);
    } catch (error) {
      console.error("チームボード更新エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボード詳細取得（slug指定）
  const getTeamBoardBySlug = createRoute({
    method: "get",
    path: "/{teamId}/boards/slug/{slug}",
    request: {
      params: z.object({
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
      params: z.object({
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
                memoCount: z.number(),
                taskCount: z.number(),
                commentCount: z.number(),
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
                      createdBy: z.string().nullable(),
                      avatarColor: z.string().nullable(),
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
                      categoryId: z.number().nullable(),
                      boardCategoryId: z.number().nullable(),
                      createdAt: z.number(),
                      updatedAt: z.number(),
                      createdBy: z.string().nullable(),
                      avatarColor: z.string().nullable(),
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
      // 担当者用のteamMembersテーブル別名
      const assigneeMembers = aliasedTable(teamMembers, "assignee_members");

      const items = await db
        .select()
        .from(teamBoardItems)
        .leftJoin(
          teamMemos,
          and(
            eq(teamBoardItems.itemType, "memo"),
            eq(teamBoardItems.displayId, teamMemos.displayId),
          ),
        )
        .leftJoin(
          teamTasks,
          and(
            eq(teamBoardItems.itemType, "task"),
            eq(teamBoardItems.displayId, teamTasks.displayId),
          ),
        )
        .leftJoin(
          teamMembers,
          and(
            eq(teamMembers.teamId, parseInt(teamId)),
            or(
              eq(teamMembers.userId, teamMemos.userId),
              eq(teamMembers.userId, teamTasks.userId),
            ),
          ),
        )
        .leftJoin(
          assigneeMembers,
          and(
            eq(assigneeMembers.teamId, parseInt(teamId)),
            eq(assigneeMembers.userId, teamTasks.assigneeId),
          ),
        )
        .where(eq(teamBoardItems.boardId, parseInt(boardId)))
        .orderBy(teamBoardItems.createdAt);

      // 各メモ・タスクのコメント数を取得
      const allComments = await db
        .select()
        .from(teamComments)
        .where(eq(teamComments.teamId, parseInt(teamId)));

      // displayIdごとのコメント数をマップ化
      const commentCountMap = new Map<string, number>();
      allComments.forEach((comment) => {
        const key = `${comment.targetType}:${comment.targetDisplayId}`;
        commentCountMap.set(key, (commentCountMap.get(key) || 0) + 1);
      });

      // フロントエンド用のレスポンス形式に変換（パーソナル用と同じ構造に）
      const formattedItems = items
        .map((item) => {
          const displayId =
            item.team_memos?.displayId || item.team_tasks?.displayId;
          const itemType = item.team_board_items.itemType;
          const commentCount = displayId
            ? commentCountMap.get(`${itemType}:${displayId}`) || 0
            : 0;

          return {
            ...item.team_board_items,
            content: item.team_memos
              ? {
                  id: item.team_memos.id,
                  title: item.team_memos.title,
                  content: item.team_memos.content,
                  displayId: item.team_memos.displayId,
                  createdAt: item.team_memos.createdAt,
                  updatedAt: item.team_memos.updatedAt,
                  createdBy: item.team_members?.displayName || null,
                  avatarColor: item.team_members?.avatarColor || null,
                  commentCount,
                }
              : item.team_tasks
                ? {
                    id: item.team_tasks.id,
                    title: item.team_tasks.title,
                    description: item.team_tasks.description,
                    status: item.team_tasks.status,
                    priority: item.team_tasks.priority,
                    dueDate: item.team_tasks.dueDate,
                    categoryId: item.team_tasks.categoryId,
                    boardCategoryId: item.team_tasks.boardCategoryId,
                    assigneeId: item.team_tasks.assigneeId,
                    displayId: item.team_tasks.displayId,
                    createdAt: item.team_tasks.createdAt,
                    updatedAt: item.team_tasks.updatedAt,
                    createdBy: item.team_members?.displayName || null,
                    avatarColor: item.team_members?.avatarColor || null,
                    assigneeName: item.assignee_members?.displayName || null,
                    assigneeAvatarColor:
                      item.assignee_members?.avatarColor || null,
                    commentCount,
                  }
                : null,
          };
        })
        .filter((item) => item.content !== null); // contentがnullのアイテムを除外

      // ボード内での順序番号を追加（itemTypeごとに1から連番）
      let memoIndex = 1;
      let taskIndex = 1;
      formattedItems.forEach((item) => {
        if (item.itemType === "memo" && item.content) {
          item.content.boardIndex = memoIndex++;
        } else if (item.itemType === "task" && item.content) {
          item.content.boardIndex = taskIndex++;
        }
      });

      // メモ数・タスク数・コメント数を計算
      const memoCount = formattedItems.filter(
        (item) => item.itemType === "memo",
      ).length;
      const taskCount = formattedItems.filter(
        (item) => item.itemType === "task",
      ).length;

      // メモとタスクのdisplayIdを収集
      const memoDisplayIds = formattedItems
        .filter((item) => item.itemType === "memo")
        .map((item) => item.displayId);
      const taskDisplayIds = formattedItems
        .filter((item) => item.itemType === "task")
        .map((item) => item.displayId);

      // コメント数集計
      let commentCount = 0;

      // ボード自体へのコメント
      const boardComments = await db
        .select()
        .from(teamComments)
        .where(
          and(
            eq(teamComments.teamId, parseInt(teamId)),
            eq(teamComments.targetType, "board"),
            eq(teamComments.targetDisplayId, board[0].id.toString()),
          ),
        );
      commentCount += boardComments.length;

      // ボード内のメモへのコメント
      if (memoDisplayIds.length > 0) {
        const memoComments = await db
          .select()
          .from(teamComments)
          .where(
            and(
              eq(teamComments.teamId, parseInt(teamId)),
              eq(teamComments.targetType, "memo"),
              or(
                ...memoDisplayIds.map((id: string) =>
                  eq(teamComments.targetDisplayId, id),
                ),
              ),
            ),
          );
        commentCount += memoComments.length;
      }

      // ボード内のタスクへのコメント
      if (taskDisplayIds.length > 0) {
        const taskComments = await db
          .select()
          .from(teamComments)
          .where(
            and(
              eq(teamComments.teamId, parseInt(teamId)),
              eq(teamComments.targetType, "task"),
              or(
                ...taskDisplayIds.map((id: string) =>
                  eq(teamComments.targetDisplayId, id),
                ),
              ),
            ),
          );
        commentCount += taskComments.length;
      }

      return c.json({
        board: {
          ...board[0],
          memoCount,
          taskCount,
          commentCount,
        },
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
      params: z.object({
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
                memoCount: z.number(),
                taskCount: z.number(),
                commentCount: z.number(),
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

      // チーム削除済みメモを取得
      const deletedMemos = await db
        .select()
        .from(teamDeletedMemos)
        .where(eq(teamDeletedMemos.teamId, parseInt(teamId)));

      // チーム削除済みタスクを取得
      const deletedTasks = await db
        .select()
        .from(teamDeletedTasks)
        .where(eq(teamDeletedTasks.teamId, parseInt(teamId)));

      // 各削除済みメモのコメント数を取得
      const deletedMemosWithCommentCount = await Promise.all(
        deletedMemos.map(async (memo) => {
          const comments = await db
            .select({ count: sql<number>`count(*)` })
            .from(teamComments)
            .where(
              and(
                eq(teamComments.teamId, parseInt(teamId)),
                eq(teamComments.targetType, "memo"),
                eq(teamComments.targetDisplayId, memo.displayId),
              ),
            );
          const commentCount = Number(comments[0]?.count || 0);
          return { ...memo, commentCount };
        }),
      );

      // 各削除済みタスクのコメント数を取得
      const deletedTasksWithCommentCount = await Promise.all(
        deletedTasks.map(async (task) => {
          const comments = await db
            .select({ count: sql<number>`count(*)` })
            .from(teamComments)
            .where(
              and(
                eq(teamComments.teamId, parseInt(teamId)),
                eq(teamComments.targetType, "task"),
                eq(teamComments.targetDisplayId, task.displayId),
              ),
            );
          const commentCount = Number(comments[0]?.count || 0);
          return { ...task, commentCount };
        }),
      );

      // 削除済みアイテムを統合フォーマットに変換
      const deletedItems = [
        ...deletedMemosWithCommentCount.map((memo) => ({
          id: memo.id,
          itemType: "memo" as const,
          itemId: memo.id,
          displayId: memo.displayId,
          deletedAt: memo.deletedAt,
          content: {
            id: memo.id,
            title: memo.title,
            content: memo.content,
            displayId: memo.displayId,
            createdAt: memo.createdAt,
            updatedAt: memo.updatedAt,
            deletedAt: memo.deletedAt,
            commentCount: memo.commentCount,
          },
        })),
        ...deletedTasksWithCommentCount.map((task) => ({
          id: task.id,
          itemType: "task" as const,
          itemId: task.id,
          displayId: task.displayId,
          deletedAt: task.deletedAt,
          content: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            displayId: task.displayId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            deletedAt: task.deletedAt,
            commentCount: task.commentCount,
          },
        })),
      ].sort((a, b) => b.deletedAt - a.deletedAt); // 削除時刻の降順

      // メモ数・タスク数・コメント数を計算（削除済みアイテムもカウント）
      const memoCount = deletedItems.filter(
        (item) => item.itemType === "memo",
      ).length;
      const taskCount = deletedItems.filter(
        (item) => item.itemType === "task",
      ).length;

      // メモとタスクのdisplayIdを収集
      const memoDisplayIds = deletedItems
        .filter((item) => item.itemType === "memo")
        .map((item) => item.displayId);
      const taskDisplayIds = deletedItems
        .filter((item) => item.itemType === "task")
        .map((item) => item.displayId);

      // コメント数集計
      let commentCount = 0;

      // ボード自体へのコメント
      const boardComments = await db
        .select()
        .from(teamComments)
        .where(
          and(
            eq(teamComments.teamId, parseInt(teamId)),
            eq(teamComments.targetType, "board"),
            eq(teamComments.targetDisplayId, board[0].id.toString()),
          ),
        );
      commentCount += boardComments.length;

      // ボード内のメモへのコメント
      if (memoDisplayIds.length > 0) {
        const memoComments = await db
          .select()
          .from(teamComments)
          .where(
            and(
              eq(teamComments.teamId, parseInt(teamId)),
              eq(teamComments.targetType, "memo"),
              or(
                ...memoDisplayIds.map((id: string) =>
                  eq(teamComments.targetDisplayId, id),
                ),
              ),
            ),
          );
        commentCount += memoComments.length;
      }

      // ボード内のタスクへのコメント
      if (taskDisplayIds.length > 0) {
        const taskComments = await db
          .select()
          .from(teamComments)
          .where(
            and(
              eq(teamComments.teamId, parseInt(teamId)),
              eq(teamComments.targetType, "task"),
              or(
                ...taskDisplayIds.map((id: string) =>
                  eq(teamComments.targetDisplayId, id),
                ),
              ),
            ),
          );
        commentCount += taskComments.length;
      }

      return c.json({
        board: {
          ...board[0],
          memoCount,
          taskCount,
          commentCount,
        },
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
      params: z.object({
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
              displayId: z.string(),
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
      let displayId: string;
      if (itemType === "memo") {
        const memo = await db
          .select({ displayId: teamMemos.displayId })
          .from(teamMemos)
          .where(
            and(
              eq(teamMemos.displayId, itemId), // itemIdは既にdisplayId形式
              eq(teamMemos.teamId, parseInt(teamId)),
            ),
          )
          .limit(1);

        if (memo.length === 0) {
          return c.json({ error: "メモが見つかりません" }, 404);
        }
        displayId = memo[0].displayId!;
      } else {
        const task = await db
          .select({ displayId: teamTasks.displayId })
          .from(teamTasks)
          .where(
            and(
              eq(teamTasks.displayId, itemId), // itemIdは既にdisplayId形式
              eq(teamTasks.teamId, parseInt(teamId)),
            ),
          )
          .limit(1);

        if (task.length === 0) {
          return c.json({ error: "タスクが見つかりません" }, 404);
        }
        displayId = task[0].displayId!;
      }

      // 既に追加されているかチェック
      const existingItem = await db
        .select()
        .from(teamBoardItems)
        .where(
          and(
            eq(teamBoardItems.boardId, parseInt(boardId)),
            eq(teamBoardItems.displayId, displayId),
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
          displayId: displayId,
        })
        .returning();

      return c.json(result[0], 201);
    } catch (error) {
      console.error("チームボードアイテム追加エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボードアイテム削除
  const removeTeamBoardItem = createRoute({
    method: "delete",
    path: "/{teamId}/boards/{boardId}/items/{itemId}",
    request: {
      params: z.object({
        teamId: z.string().openapi({ example: "1" }),
        boardId: z.string().openapi({ example: "1" }),
        itemId: z.string().openapi({ example: "1" }),
      }),
      query: z.object({
        itemType: z.enum(["memo", "task"]).openapi({ example: "memo" }),
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
        description: "チームボードアイテム削除成功",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "認証が必要",
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

  app.openapi(removeTeamBoardItem, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId, boardId, itemId } = c.req.param();
    const { itemType } = c.req.valid("query");
    const db = c.get("db");

    console.log("🗑️ [チームボードアイテム削除] リクエスト受信:", {
      teamId,
      boardId,
      itemId,
      itemType,
      userId: auth.userId,
    });

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
        console.log("❌ チームメンバーではありません");
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
        console.log("❌ ボードが見つかりません:", {
          boardId: parseInt(boardId),
          teamId: parseInt(teamId),
        });
        return c.json({ error: "ボードが見つかりません" }, 404);
      }

      // itemIdをdisplayIdとして直接使用（文字列のまま）
      const displayId = itemId;

      console.log("🔍 削除対象アイテム検索:", {
        boardId: parseInt(boardId),
        itemType,
        displayId,
      });

      // 削除前に存在確認
      const existingItem = await db
        .select()
        .from(teamBoardItems)
        .where(
          and(
            eq(teamBoardItems.boardId, parseInt(boardId)),
            eq(teamBoardItems.itemType, itemType),
            eq(teamBoardItems.displayId, displayId),
          ),
        )
        .limit(1);

      if (existingItem.length === 0) {
        return c.json({ error: "ボードにアイテムが見つかりません" }, 404);
      }

      // アイテムを物理削除（レコード自体を削除）
      await db
        .delete(teamBoardItems)
        .where(
          and(
            eq(teamBoardItems.boardId, parseInt(boardId)),
            eq(teamBoardItems.itemType, itemType),
            eq(teamBoardItems.displayId, displayId),
          ),
        );

      // ボードのupdatedAtを更新
      await db
        .update(teamBoards)
        .set({ updatedAt: new Date() })
        .where(eq(teamBoards.id, parseInt(boardId)));

      return c.json({ success: true });
    } catch (error) {
      console.error("チームボードアイテム削除エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  // チームボード削除
  const deleteTeamBoard = createRoute({
    method: "delete",
    path: "/{teamId}/boards/{id}",
    request: {
      params: z.object({
        teamId: z.string().openapi({ example: "1" }),
        id: z.string().openapi({ example: "1" }),
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
        description: "チームボード削除成功",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "認証が必要",
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
        description: "ボードが見つかりません",
      },
    },
  });

  app.openapi(deleteTeamBoard, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const { teamId, id } = c.req.param();
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
            eq(teamBoards.id, parseInt(id)),
            eq(teamBoards.teamId, parseInt(teamId)),
          ),
        )
        .limit(1);

      if (board.length === 0) {
        return c.json({ error: "ボードが見つかりません" }, 404);
      }

      // ボードに紐づくコメントを削除
      await db
        .delete(teamComments)
        .where(
          and(
            eq(teamComments.teamId, parseInt(teamId)),
            eq(teamComments.targetType, "board"),
            eq(teamComments.targetDisplayId, board[0].id.toString()),
          ),
        );

      // ボード本体を物理削除（team_board_itemsはカスケード削除される）
      await db.delete(teamBoards).where(eq(teamBoards.id, parseInt(id)));

      return c.json({ success: true });
    } catch (error) {
      console.error("チームボード削除エラー:", error);
      return c.json({ error: "サーバーエラーが発生しました" }, 500);
    }
  });

  return app;
}
