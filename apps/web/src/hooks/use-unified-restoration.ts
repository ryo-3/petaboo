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
    mutationFn: async (itemId: string) => {
      // 既存のrestoreItemがある場合は使用、ない場合は直接API呼び出し
      if (restoreItem) {
        return await restoreItem.mutateAsync(itemId);
      }

      // フォールバック: 直接API呼び出し
      const token = await getToken();

      if (itemType === "memo") {
        if (teamMode && teamId) {
          // チームメモ復元: displayId を送信
          const response = await memosApi.restoreTeamMemo(
            teamId,
            itemId,
            token || undefined,
          );
          return response.json();
        } else {
          // 個人メモ復元: originalId を送信
          const response = await memosApi.restoreNote(
            itemId,
            token || undefined,
          );
          return response.json();
        }
      } else if (itemType === "task") {
        if (teamMode && teamId) {
          // チームタスク復元: displayId を送信
          const response = await tasksApi.restoreTeamTask(
            teamId,
            itemId,
            token || undefined,
          );
          return response.json();
        } else {
          // 個人タスク復元: originalId を送信
          const response = await tasksApi.restoreTask(
            itemId,
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
    onError: (error: unknown) => {
      console.error("統一復元エラー:", error);
      console.error("エラー詳細:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error,
      });
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

    // リセット（次選択の前にリセットして無限ループ防止）
    const nextItem = nextItemAfterRestore;
    setRestoringItemId(null);
    setNextItemAfterRestore(null);

    if (nextItem) {
      onSelectDeletedItem(nextItem);
    } else if (deletedItems.length === 0) {
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
      return;
    }

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

    // 次選択を保存（deletedItems更新時のuseEffectで使用）
    setNextItemAfterRestore(nextItem);
    setRestoringItemId(selectedDeletedItem.id);

    try {
      // 復元API実行（チーム側はdisplayId、個人側はoriginalId）
      const itemId =
        teamMode && selectedDeletedItem.displayId
          ? selectedDeletedItem.displayId
          : selectedDeletedItem.originalId;
      await restoreMutation.mutateAsync(itemId);

      // キャッシュ無効化（次選択はuseEffectで自動実行）
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: [`team-deleted-${itemType}s`, teamId],
        });
        await queryClient.invalidateQueries({
          queryKey: [`team-${itemType}s`, teamId],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: [itemType === "memo" ? "deletedMemos" : "deleted-tasks"],
        });
        await queryClient.invalidateQueries({
          queryKey: [itemType + "s"],
        });
      }
    } catch (error: unknown) {
      console.error("❌ 統一復元処理エラー:", error);
      console.error("エラー詳細:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        selectedDeletedItem,
        itemId:
          teamMode && selectedDeletedItem.displayId
            ? selectedDeletedItem.displayId
            : selectedDeletedItem.originalId,
        teamMode,
        teamId,
      });
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
