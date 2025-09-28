import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { memosApi, tasksApi } from "@/src/lib/api-client";
import type { DeletedMemo } from "@/src/types/memo";
import type { DeletedTask } from "@/src/types/task";

type DeletedItem = DeletedMemo | DeletedTask;

interface UseUnifiedRestorationProps<T extends DeletedItem> {
  itemType: "memo" | "task";
  deletedItems: T[] | null;
  selectedDeletedItem: T | null;
  onSelectDeletedItem: (item: T | null) => void;
  setActiveTab?: (tab: string) => void;
  setScreenMode?: (mode: string) => void;
  teamMode?: boolean;
  teamId?: number;
  restoreItem?: {
    mutateAsync: (originalId: string) => Promise<unknown>;
  };
}

/**
 * メモとタスクの復元処理を統一する共通フック
 * - 復元API実行
 * - キャッシュ更新
 * - 次選択処理
 */
export function useUnifiedRestoration<T extends DeletedItem>({
  itemType,
  deletedItems,
  selectedDeletedItem,
  onSelectDeletedItem,
  setActiveTab,
  setScreenMode,
  teamMode = false,
  teamId,
  restoreItem,
}: UseUnifiedRestorationProps<T>) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // 統一復元ミューテーション
  const restoreMutation = useMutation({
    mutationFn: async (originalId: string) => {
      // 既存のrestoreItemがある場合は使用、ない場合は直接API呼び出し
      if (restoreItem) {
        return await restoreItem.mutateAsync(originalId);
      }

      // フォールバック: 直接API呼び出し
      const token = await getToken();
      if (itemType === "memo") {
        if (teamMode && teamId) {
          const response = await memosApi.restoreTeamMemo(
            teamId,
            originalId,
            token || undefined,
          );
          return response.json();
        } else {
          const response = await memosApi.restoreNote(
            originalId,
            token || undefined,
          );
          return response.json();
        }
      } else if (itemType === "task") {
        if (teamMode && teamId) {
          const response = await tasksApi.restoreTeamTask(
            teamId,
            originalId,
            token || undefined,
          );
          return response.json();
        } else {
          const response = await tasksApi.restoreTask(
            originalId,
            token || undefined,
          );
          return response.json();
        }
      }

      throw new Error(
        `Unsupported restoration: ${itemType} without restoreItem`,
      );
    },
    onSuccess: async () => {
      // restoreItemを使用した場合はキャッシュ無効化を省略（restoreItem内で実行済み）
      if (restoreItem) {
        return;
      }

      // キャッシュを無効化して最新データを取得（直接API呼び出し時のみ）
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: [`team-deleted-${itemType}s`, teamId],
        });
        await queryClient.invalidateQueries({
          queryKey: [`team-${itemType}s`, teamId],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: [`deleted-${itemType}s`],
        });
        await queryClient.invalidateQueries({
          queryKey: [itemType + "s"],
        });
      }
    },
    onError: (error) => {
      console.error("統一復元エラー:", error);
    },
  });

  // 復元と次選択を実行する統一関数
  const handleRestoreAndSelectNext = useCallback(async () => {
    if (!selectedDeletedItem || !deletedItems) {
      return;
    }

    // 復元前に次選択対象を事前計算
    const currentIndex = deletedItems.findIndex(
      (item) => item.originalId === selectedDeletedItem.originalId,
    );
    const remainingItems = deletedItems.filter(
      (item) => item.originalId !== selectedDeletedItem.originalId,
    );

    try {
      // 復元API実行
      await restoreMutation.mutateAsync(selectedDeletedItem.originalId);

      // 次選択処理実行
      if (remainingItems.length > 0) {
        const nextIndex =
          currentIndex >= remainingItems.length
            ? remainingItems.length - 1
            : currentIndex;
        const nextItem = remainingItems[nextIndex] || null;
        onSelectDeletedItem(nextItem);
      } else {
        onSelectDeletedItem(null);
        setActiveTab?.("normal");
        setScreenMode?.("list");
      }
    } catch (error) {
      console.error("統一復元処理エラー:", error);
      throw error;
    }
  }, [
    selectedDeletedItem,
    deletedItems,
    restoreMutation,
    onSelectDeletedItem,
    setActiveTab,
    setScreenMode,
  ]);

  return {
    handleRestoreAndSelectNext,
    isRestoring: restoreMutation.isPending,
  };
}
