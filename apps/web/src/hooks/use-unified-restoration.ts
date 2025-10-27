import { useCallback, useState, useEffect } from "react";
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

  // 復元後に選択する次のアイテムを保存（削除時の次選択と同じパターン）
  const [nextItemAfterRestore, setNextItemAfterRestore] = useState<T | null>(
    null,
  );
  // 復元中のアイテムIDを追跡
  const [restoringItemId, setRestoringItemId] = useState<number | null>(null);

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

  // deletedItems更新時に復元完了を検知して次選択（削除時の次選択と同じパターン）
  useEffect(() => {
    if (!restoringItemId || !deletedItems) {
      return; // 復元中でない、またはdeletedItemsがnull
    }

    // 復元中のアイテムがまだ削除済みリストに残っているか確認
    const isStillInList = deletedItems.find(
      (item) => item.id === restoringItemId,
    );
    if (isStillInList) {
      return; // まだ復元完了していない
    }

    // 復元完了を検知！次のアイテムを選択
    console.log("✅ 復元完了検知（deletedItems更新）:", {
      restoringItemId,
      nextItemAfterRestore: nextItemAfterRestore?.id,
      deletedItemsCount: deletedItems.length,
    });

    // リセット（次選択の前にリセットして無限ループ防止）
    const nextItem = nextItemAfterRestore;
    setRestoringItemId(null);
    setNextItemAfterRestore(null);

    if (nextItem) {
      console.log("🔄 次のアイテムを選択:", {
        id: nextItem.id,
        originalId: nextItem.originalId,
        title: "title" in nextItem ? nextItem.title : "N/A",
      });
      onSelectDeletedItem(nextItem);
    } else if (deletedItems.length === 0) {
      console.log("🔄 削除済みアイテムがなくなったため通常タブに移動");
      onSelectDeletedItem(null);
      setActiveTab?.("normal");
      setScreenMode?.("list");
    }
  }, [
    restoringItemId,
    deletedItems,
    nextItemAfterRestore,
    onSelectDeletedItem,
    setActiveTab,
    setScreenMode,
  ]);

  // 復元と次選択を実行する統一関数
  const handleRestoreAndSelectNext = useCallback(async () => {
    if (!selectedDeletedItem || !deletedItems) {
      console.log(
        "🔄 復元スキップ: selectedDeletedItem または deletedItems が null",
      );
      return;
    }

    console.log("🔄 復元開始:", {
      itemType,
      originalId: selectedDeletedItem.originalId,
      title: "title" in selectedDeletedItem ? selectedDeletedItem.title : "N/A",
      teamMode,
      teamId,
      deletedItemsCount: deletedItems.length,
    });

    // 復元前に次選択対象を事前計算（削除時の次選択と同じパターン）
    const currentIndex = deletedItems.findIndex(
      (item) => item.originalId === selectedDeletedItem.originalId,
    );

    // 復元後のリスト（復元するアイテムを除外）から次アイテムを計算
    const remainingItems = deletedItems.filter(
      (item) => item.originalId !== selectedDeletedItem.originalId,
    );

    // 同じインデックス位置を選択（存在しない場合は最後のアイテム）
    const nextIndex =
      currentIndex >= remainingItems.length
        ? remainingItems.length - 1
        : currentIndex;
    const nextItem = remainingItems[nextIndex] || null;

    console.log("🔄 次選択対象を事前計算:", {
      currentIndex,
      remainingItemsCount: remainingItems.length,
      nextIndex,
      nextItemId: nextItem?.id,
      nextItemOriginalId: nextItem?.originalId,
      nextItemTitle: nextItem && "title" in nextItem ? nextItem.title : "N/A",
    });

    // 次選択を保存（deletedItems更新時のuseEffectで使用）
    setNextItemAfterRestore(nextItem);
    setRestoringItemId(selectedDeletedItem.id);

    try {
      // 復元API実行
      console.log("🔄 復元API実行中...");
      await restoreMutation.mutateAsync(selectedDeletedItem.originalId);
      console.log("✅ 復元API完了");

      // キャッシュ無効化（次選択はuseEffectで自動実行）
      console.log("🔄 キャッシュ無効化開始...");
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: [`team-deleted-${itemType}s`, teamId],
        });
        await queryClient.invalidateQueries({
          queryKey: [`team-${itemType}s`, teamId],
        });
        console.log("✅ チームキャッシュ無効化完了");
      } else {
        await queryClient.invalidateQueries({
          queryKey: [itemType === "memo" ? "deletedMemos" : "deleted-tasks"],
        });
        await queryClient.invalidateQueries({
          queryKey: [itemType + "s"],
        });
        console.log("✅ 個人キャッシュ無効化完了");
      }
      console.log("✅ 復元処理完了（次選択はuseEffectで自動実行）");
    } catch (error) {
      console.error("❌ 統一復元処理エラー:", error);
      throw error;
    }
  }, [
    selectedDeletedItem,
    deletedItems,
    restoreMutation,
    queryClient,
    teamMode,
    teamId,
    itemType,
  ]);

  return {
    handleRestoreAndSelectNext,
    isRestoring: restoreMutation.isPending,
  };
}
