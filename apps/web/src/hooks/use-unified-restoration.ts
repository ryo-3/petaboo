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
    mutateAsync: (originalId: string) => Promise<any>;
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
      console.log("🔄 統一復元API実行開始", {
        itemType,
        originalId,
        teamMode,
        teamId,
      });

      // 既存のrestoreItemがある場合は使用、ない場合は直接API呼び出し
      if (restoreItem) {
        console.log("🔧 既存restoreItem使用", {
          itemType,
          originalId,
          restoreItemExists: !!restoreItem,
          mutateAsyncExists: !!restoreItem.mutateAsync,
        });
        return await restoreItem.mutateAsync(originalId);
      }

      // フォールバック: 直接API呼び出し（タスク用）
      const token = await getToken();
      if (itemType === "task") {
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
    onSuccess: async (_, originalId) => {
      console.log("✅ 統一復元API完了", { itemType, originalId });

      // restoreItemを使用した場合はキャッシュ無効化を省略（restoreItem内で実行済み）
      if (restoreItem) {
        console.log("✅ 統一復元: restoreItem使用のためキャッシュ無効化省略");
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

      console.log("✅ 統一復元: キャッシュ無効化完了");
    },
    onError: (error) => {
      console.error("❌ 統一復元エラー:", error);
      console.error("❌ エラー詳細:", JSON.stringify(error, null, 2));
      console.error("❌ エラータイプ:", typeof error);
      console.error("❌ エラー文字列:", String(error));
      if (error instanceof Error) {
        console.error("❌ エラーメッセージ:", error.message);
        console.error("❌ エラースタック:", error.stack);
      }
    },
  });

  // 復元と次選択を実行する統一関数
  const handleRestoreAndSelectNext = useCallback(async () => {
    console.log("🚀 統一復元フック実行開始", {
      itemType,
      selectedDeletedItem: selectedDeletedItem?.originalId,
      deletedItemsCount: deletedItems?.length,
      teamMode,
      teamId,
    });

    if (!selectedDeletedItem || !deletedItems) {
      console.log("❌ 統一復元対象なし", { selectedDeletedItem, deletedItems });
      return;
    }

    console.log("🎯 統一復元処理開始", {
      itemType,
      originalId: selectedDeletedItem.originalId,
    });

    // 復元前に次選択対象を事前計算
    const currentIndex = deletedItems.findIndex(
      (item) => item.originalId === selectedDeletedItem.originalId,
    );
    const remainingItems = deletedItems.filter(
      (item) => item.originalId !== selectedDeletedItem.originalId,
    );

    console.log("🎯 次選択計算:", {
      currentIndex,
      remainingItemsLength: remainingItems.length,
    });

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
        console.log("➡️ 次のアイテムを選択:", { nextIndex, nextItem });
        onSelectDeletedItem(nextItem);
      } else {
        console.log("🏁 削除済みアイテムなし - 通常画面に戻る");
        onSelectDeletedItem(null);
        setActiveTab?.("normal");
        setScreenMode?.("list");
      }
    } catch (error) {
      console.error("❌ 統一復元処理エラー:", error);
      throw error;
    }
  }, [
    selectedDeletedItem,
    deletedItems,
    itemType,
    restoreMutation,
    onSelectDeletedItem,
    setActiveTab,
    setScreenMode,
    teamMode,
    teamId,
  ]);

  return {
    handleRestoreAndSelectNext,
    isRestoring: restoreMutation.isPending,
  };
}
