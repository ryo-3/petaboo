import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
// import { useToast } from "@/src/contexts/toast-context"; // 現在は未使用
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import { memosApi } from "@/src/lib/api-client";
import { tasksApi } from "@/src/lib/api-client";
import { updateItemCache } from "@/src/lib/cache-utils";

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
          restore: async (displayId: string, token?: string) => {
            const response = await memosApi.restoreNote(displayId, token);
            return response.json();
          },
        };
      case "team":
        return {
          delete: async (id: number, token?: string) => {
            const response = await memosApi.deleteTeamMemo(teamId!, id, token);
            return response.json();
          },
          restore: async (displayId: string, token?: string) => {
            const response = await memosApi.restoreTeamMemo(
              teamId!,
              displayId,
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
          restore: async (displayId: string, token?: string) => {
            const response = await tasksApi.restoreTask(displayId, token);
            return response.json();
          },
        };
      case "team":
        return {
          delete: async (id: number, token?: string) => {
            const response = await tasksApi.deleteTeamTask(teamId!, id, token);
            return response.json();
          },
          restore: async (displayId: string, token?: string) => {
            const response = await tasksApi.restoreTeamTask(
              teamId!,
              displayId,
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
  // useBoardWithItemsはteamIdをstringで受け取るため、キャッシュキーもstringに統一
  const teamIdStr = teamId?.toString();

  if (itemType === "memo") {
    return {
      items: isTeam ? ["team-memos", teamId] : ["memos"],
      deletedItems: isTeam ? ["team-deleted-memos", teamId] : ["deletedMemos"],
      boardItems:
        isTeam && boardId
          ? ["team-boards", teamIdStr, boardId, "items"]
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
          ? ["team-boards", teamIdStr, boardId, "items"]
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
      if (context === "team" && teamId) {
        // チームモード: updateItemCacheで統一管理
        const deletedItem = queryClient
          .getQueryData<UnifiedItem[]>(cacheKeys.items)
          ?.find((item) => item.id === id);

        if (deletedItem) {
          updateItemCache({
            queryClient,
            itemType,
            operation: "delete",
            item: deletedItem,
            teamId,
            boardId,
          });
        }
      } else {
        // 個人モード: updateItemCacheで統一管理
        const deletedItem = queryClient
          .getQueryData<UnifiedItem[]>(cacheKeys.items)
          ?.find((item) => item.id === id);

        if (deletedItem) {
          updateItemCache({
            queryClient,
            itemType,
            operation: "delete",
            item: deletedItem,
            boardId,
          });
        }
      }
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
    mutationFn: async (displayId: string) => {
      // 復元実行ログ（削除予定）

      const token = await getToken();
      const response = await apiEndpoints.restore(
        displayId,
        token || undefined,
      );
      return response;
    },
    onSuccess: (restoredItemData, displayId) => {
      if (context === "team" && teamId) {
        // チームモード: updateItemCacheで統一管理
        const deletedItem = queryClient
          .getQueryData<UnifiedDeletedItem[]>(cacheKeys.deletedItems)
          ?.find((item) => item.displayId === displayId);

        if (deletedItem && restoredItemData) {
          updateItemCache({
            queryClient,
            itemType,
            operation: "restore",
            item: deletedItem,
            teamId,
            boardId,
          });
        }
      } else {
        // 個人モード: updateItemCacheで統一管理
        const deletedItem = queryClient
          .getQueryData<UnifiedDeletedItem[]>(cacheKeys.deletedItems)
          ?.find((item) => item.displayId === displayId);

        if (deletedItem && restoredItemData) {
          updateItemCache({
            queryClient,
            itemType,
            operation: "restore",
            item: deletedItem,
            boardId,
          });
        }
      }
      // 必要なボードキャッシュは上で個別に無効化済み

      // showToast(`${itemName}を復元しました`, "success"); // トースト通知は無効化
    },
    onError: (error: unknown) => {
      const itemName = itemType === "memo" ? "メモ" : "タスク";
      console.error(`${itemName}復元に失敗しました:`, error);
      console.error("復元エラー詳細:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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
