import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
// import { useToast } from "@/src/contexts/toast-context"; // 現在は未使用
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import { memosApi } from "@/src/lib/api-client";
import { tasksApi } from "@/src/lib/api-client";

// 統一アイテム型定義
type UnifiedItem = Memo | Task;
type UnifiedDeletedItem = DeletedMemo | DeletedTask;

// コンテキスト型定義
type OperationContext = "personal" | "team" | "board-detail";

// オプション型定義
interface UnifiedItemOperationsOptions {
  itemType: "memo" | "task";
  context: OperationContext;
  teamId?: number;
  boardId?: number;
}

// APIエンドポイントマッピング
const getApiEndpoints = (
  itemType: "memo" | "task",
  context: OperationContext,
  teamId?: number,
) => {
  if (itemType === "memo") {
    switch (context) {
      case "personal":
      case "board-detail":
        return {
          delete: async (id: number, token?: string) => {
            const response = await memosApi.deleteNote(id, token);
            return response; // 個人メモはresponseオブジェクトをそのまま返す
          },
          restore: async (originalId: string, token?: string) => {
            const response = await memosApi.restoreNote(originalId, token);
            return response.json();
          },
        };
      case "team":
        return {
          delete: async (id: number, token?: string) => {
            const response = await memosApi.deleteTeamMemo(teamId!, id, token);
            return response.json();
          },
          restore: async (originalId: string, token?: string) => {
            const response = await memosApi.restoreTeamMemo(
              teamId!,
              originalId,
              token,
            );
            return response.json();
          },
        };
    }
  } else {
    switch (context) {
      case "personal":
      case "board-detail":
        return {
          delete: async (id: number, token?: string) => {
            const response = await tasksApi.deleteTask(id, token);
            return response; // 個人タスクはresponseオブジェクトをそのまま返す
          },
          restore: async (originalId: string, token?: string) => {
            const response = await tasksApi.restoreTask(originalId, token);
            return response.json();
          },
        };
      case "team":
        return {
          delete: async (id: number, token?: string) => {
            const response = await tasksApi.deleteTeamTask(teamId!, id, token);
            return response.json();
          },
          restore: async (originalId: string, token?: string) => {
            const response = await tasksApi.restoreTeamTask(
              teamId!,
              originalId,
              token,
            );
            return response.json();
          },
        };
    }
  }
};

// キャッシュキーマッピング
const getCacheKeys = (
  itemType: "memo" | "task",
  context: OperationContext,
  teamId?: number,
  boardId?: number,
) => {
  const isTeam = context === "team" && teamId;

  if (itemType === "memo") {
    return {
      items: isTeam ? ["team-memos", teamId] : ["memos"],
      deletedItems: isTeam ? ["team-deleted-memos", teamId] : ["deletedMemos"],
      boardItems:
        isTeam && boardId
          ? ["team-boards", teamId, boardId, "items"]
          : boardId
            ? ["boards", boardId, "items"]
            : null,
      boardDeletedItems:
        isTeam && boardId
          ? ["team-board-deleted-items", teamId, boardId]
          : boardId
            ? ["board-deleted-items", boardId]
            : null,
    };
  } else {
    return {
      items: isTeam ? ["team-tasks", teamId] : ["tasks"],
      deletedItems: isTeam ? ["team-deleted-tasks", teamId] : ["deleted-tasks"],
      boardItems:
        isTeam && boardId
          ? ["team-boards", teamId, boardId, "items"]
          : boardId
            ? ["boards", boardId, "items"]
            : null,
      boardDeletedItems:
        isTeam && boardId
          ? ["team-board-deleted-items", teamId, boardId]
          : boardId
            ? ["board-deleted-items", boardId]
            : null,
    };
  }
};

/**
 * 統一アイテム操作フック
 * メモ・タスク・個人・チーム・ボード詳細の全コンテキストで削除・復元を統一処理
 */
export function useUnifiedItemOperations({
  itemType,
  context,
  teamId,
  boardId,
}: UnifiedItemOperationsOptions) {
  // 呼び出し情報（デバッグ用 - 削除予定）
  // const callerInfo = new Error().stack?.split('\n')[2]?.trim() || "不明";

  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  // const { showToast } = useToast(); // 現在は未使用

  const apiEndpoints = getApiEndpoints(itemType, context, teamId);
  const cacheKeys = getCacheKeys(itemType, context, teamId, boardId);

  // 統一削除処理
  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      // 削除実行ログ（削除予定）

      const token = await getToken();
      await apiEndpoints.delete(id, token || undefined);
    },
    onSuccess: (_, id) => {
      // const itemName = itemType === "memo" ? "メモ" : "タスク"; // 現在は未使用
      // const contextName = context === "team" ? "チーム" : "個人"; // 現在は未使用

      // アイテム一覧から削除されたアイテムを楽観的更新で即座に除去
      const deletedItem = queryClient
        .getQueryData<UnifiedItem[]>(cacheKeys.items)
        ?.find((item) => item.id === id);

      queryClient.setQueryData<UnifiedItem[]>(cacheKeys.items, (oldItems) => {
        if (!oldItems) return [];
        return oldItems.filter((item) => item.id !== id);
      });

      // 削除済み一覧に楽観的更新で即座に追加
      if (deletedItem) {
        // 楽観的更新ログ（削除予定）

        const deletedItemWithDeletedAt = {
          ...deletedItem,
          originalId: deletedItem.originalId || id.toString(),
          deletedAt: Date.now(), // Unix timestamp形式
        };

        queryClient.setQueryData<UnifiedDeletedItem[]>(
          cacheKeys.deletedItems,
          (oldDeletedItems) => {
            if (!oldDeletedItems)
              return [deletedItemWithDeletedAt as UnifiedDeletedItem];
            // 重複チェック
            const exists = oldDeletedItems.some(
              (item) => item.originalId === deletedItemWithDeletedAt.originalId,
            );
            if (exists) {
              // 重複スキップログ（削除予定）
              return oldDeletedItems;
            }
            return [
              deletedItemWithDeletedAt as UnifiedDeletedItem,
              ...oldDeletedItems,
            ];
          },
        );
      }

      // バックグラウンドで安全性のため無効化
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as string[];
          if (context === "team" && teamId) {
            return (
              key[0] === `team-deleted-${itemType}s` &&
              key[1] === teamId.toString()
            );
          }
          return (
            key[0] === (itemType === "memo" ? "deletedMemos" : "deleted-tasks")
          );
        },
      });

      // ボード関連キャッシュの更新
      if (context === "team" && teamId) {
        queryClient.refetchQueries({
          queryKey: ["team-boards", teamId],
        });
        if (cacheKeys.boardItems) {
          queryClient.refetchQueries({
            queryKey: cacheKeys.boardItems,
          });
        }
      } else {
        queryClient.refetchQueries({ queryKey: ["boards"] });
        if (cacheKeys.boardItems) {
          queryClient.refetchQueries({
            queryKey: cacheKeys.boardItems,
          });
        }
      }

      // 全タグ付け情報を無効化
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });

      // 全ボードアイテム情報を無効化（ボード紐づき表示用）
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: ["boards", "all-items", teamId],
        });
      }

      // showToast(`${itemName}を削除しました`, "success"); // トースト通知は無効化
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError: (_error) => {
      // const itemName = itemType === "memo" ? "メモ" : "タスク"; // 現在は未使用
      // console.error(`${itemName}削除に失敗しました:`, error);
      // showToast(`${itemName}削除に失敗しました`, "error"); // トースト通知は無効化
    },
  });

  // 統一復元処理
  const restoreItem = useMutation({
    mutationFn: async (originalId: string) => {
      // 復元実行ログ（削除予定）

      const token = await getToken();
      const response = await apiEndpoints.restore(
        originalId,
        token || undefined,
      );
      return response;
    },
    onSuccess: (restoredItemData, originalId) => {
      // const contextName = context === "team" ? "チーム" : "個人"; // 現在は未使用

      // 削除済み一覧から復元されたアイテムを楽観的更新で即座に除去
      const deletedItem = queryClient
        .getQueryData<UnifiedDeletedItem[]>(cacheKeys.deletedItems)
        ?.find((item) => item.originalId === originalId);

      queryClient.setQueryData<UnifiedDeletedItem[]>(
        cacheKeys.deletedItems,
        (oldDeletedItems) => {
          if (!oldDeletedItems) return [];
          return oldDeletedItems.filter(
            (item) => item.originalId !== originalId,
          );
        },
      );

      // 通常一覧に復元されたアイテムを楽観的更新で追加
      if (deletedItem && restoredItemData) {
        // console.log(`🔄 ${contextName}通常一覧に楽観的更新で追加`, {
        //   itemId: deletedItem.id,
        //   itemType,
        //   itemOriginalId: originalId,
        //   itemTitle: deletedItem.title,
        //   context,
        //   teamId,
        //   boardId,
        //   時刻: new Date().toISOString(),
        // });

        // 復元されたアイテムデータを使用（deletedAtを除去）
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { deletedAt, ...restoredItem } = deletedItem;
        queryClient.setQueryData<UnifiedItem[]>(cacheKeys.items, (oldItems) => {
          if (!oldItems) return [restoredItem as UnifiedItem];
          // 重複チェック
          const exists = oldItems.some(
            (item) => item.originalId === restoredItem.originalId,
          );
          if (exists) {
            // console.log(
            //   `⚠️ ${contextName}通常一覧に既に存在するためスキップ`,
            //   restoredItem.originalId,
            // );
            return oldItems;
          }
          return [restoredItem as UnifiedItem, ...oldItems];
        });
      }

      // バックグラウンドで安全性のため無効化・再取得
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as string[];
          if (context === "team" && teamId) {
            return (
              key[0] === `team-deleted-${itemType}s` &&
              key[1] === teamId.toString()
            );
          }
          return (
            key[0] === (itemType === "memo" ? "deletedMemos" : "deleted-tasks")
          );
        },
      });
      queryClient.refetchQueries({ queryKey: cacheKeys.items });

      // ボード関連キャッシュの更新
      if (context === "team" && teamId) {
        queryClient.invalidateQueries({
          queryKey: ["team-boards", teamId.toString()],
          exact: false,
        });
        if (cacheKeys.boardDeletedItems) {
          queryClient.invalidateQueries({
            queryKey: cacheKeys.boardDeletedItems,
          });
          queryClient.refetchQueries({
            queryKey: cacheKeys.boardDeletedItems,
          });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["boards"], exact: false });
        if (cacheKeys.boardDeletedItems) {
          queryClient.invalidateQueries({
            queryKey: cacheKeys.boardDeletedItems,
          });
          queryClient.refetchQueries({
            queryKey: cacheKeys.boardDeletedItems,
          });
        }
      }

      // 全タグ付け情報を無効化
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });

      // 全ボードアイテム情報を無効化（ボード紐づき表示用）
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: ["boards", "all-items", teamId],
        });
      }

      // showToast(`${itemName}を復元しました`, "success"); // トースト通知は無効化
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError: (error) => {
      const itemName = itemType === "memo" ? "メモ" : "タスク";
      console.error(`${itemName}復元に失敗しました:`, error);
      console.error("復元エラー詳細:", {
        message: error?.message,
        stack: error?.stack,
        itemType,
        context,
        teamId,
        error,
      });
      // showToast(`${itemName}復元に失敗しました`, "error"); // トースト通知は無効化
    },
  });

  return {
    deleteItem,
    restoreItem,
    isDeleting: deleteItem.isPending,
    isRestoring: restoreItem.isPending,
  };
}
