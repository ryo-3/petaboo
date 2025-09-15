import { useCallback, useRef } from "react";
import { useRestoreMemo } from "@/src/hooks/use-memos";
import { useRestoreTask } from "@/src/hooks/use-tasks";
import { useBulkDelete, BulkRestoreConfirmation } from "@/components/ui/modals";
import type { DeletedMemo } from "@/src/types/memo";
import type { DeletedTask } from "@/src/types/task";
import React from "react";
import { useBulkAnimation } from "@/src/hooks/use-bulk-animation";
import { executeWithAnimation } from "@/src/utils/bulkAnimationUtils";
import { BoardItemWithContent } from "@/src/types/board";

interface UseBoardBulkRestoreProps {
  // 共通
  itemType: "memo" | "task";
  checkedItems: Set<string | number>;
  setCheckedItems: (items: Set<string | number>) => void;
  boardItems: BoardItemWithContent[];

  // メモ用
  deletedMemos?: DeletedMemo[];

  // タスク用
  deletedTasks?: DeletedTask[];

  // チーム情報
  teamMode?: boolean;
  teamId?: number;
  boardId?: number;

  // 状態管理
  setIsRestoring?: (isRestoring: boolean) => void;
  setIsLidOpen?: (isOpen: boolean) => void;
}

export function useBoardBulkRestore({
  itemType,
  checkedItems,
  setCheckedItems,
  boardItems,
  deletedMemos,
  deletedTasks,
  teamMode,
  teamId,
  boardId,
  setIsRestoring,
  setIsLidOpen,
}: UseBoardBulkRestoreProps) {
  const restoreMemoMutation = useRestoreMemo({ teamMode, teamId, boardId });
  const restoreTaskMutation = useRestoreTask({ teamMode, teamId, boardId });
  const bulkRestore = useBulkDelete(); // 削除と同じモーダルロジックを使用
  const restoreButtonRef = useRef<HTMLButtonElement | null>(null);

  // 共通のアニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: new Set(),
    checkedDeletedItems:
      itemType === "memo"
        ? new Set(
            Array.from(checkedItems).filter(
              (id) => typeof id === "number",
            ) as number[],
          )
        : new Set(
            Array.from(checkedItems).filter(
              (id) => typeof id === "number",
            ) as number[],
          ),
  });

  // 共通の復元処理関数
  const executeRestoreWithAnimation = useCallback(
    async (
      ids: number[],
      isPartialRestore = false,
      originalTotalCount?: number,
    ) => {
      const onCheckStateUpdate = (ids: number[], isPartial: boolean) => {
        if (isPartial) {
          const newCheckedItems = new Set(checkedItems);
          ids.forEach((id) => {
            // originalIdで管理されている場合の変換処理
            const boardItem = boardItems.find((item) => {
              const content = item.content as DeletedMemo | DeletedTask;
              return content.id === id;
            });
            if (boardItem) {
              newCheckedItems.delete(boardItem.itemId);
            }
          });
          setCheckedItems(newCheckedItems);
        } else {
          console.log("🔍 復元後全クリア実行前:", Array.from(checkedItems));
          setCheckedItems(new Set());
          console.log("🔍 復元後全クリア実行後: 空のSet");
        }
      };

      const onApiCall = async (id: number) => {
        if (itemType === "memo") {
          // idからoriginalIdに変換
          const deletedMemo = deletedMemos?.find((memo) => memo.id === id);
          if (!deletedMemo) {
            throw new Error(`削除済みメモが見つかりません: ID ${id}`);
          }
          await restoreMemoMutation.mutateAsync(deletedMemo.originalId);
        } else {
          // idからoriginalIdに変換
          const deletedTask = deletedTasks?.find((task) => task.id === id);
          if (!deletedTask) {
            throw new Error(`削除済みタスクが見つかりません: ID ${id}`);
          }
          await restoreTaskMutation.mutateAsync(deletedTask.originalId);
        }
      };

      await executeWithAnimation({
        ids,
        isPartial: isPartialRestore,
        originalTotalCount,
        buttonRef: restoreButtonRef,
        dataAttribute: itemType === "memo" ? "data-memo-id" : "data-task-id",
        actionType: "restore",
        onStateUpdate: () => {}, // ボードでは個別の状態更新は不要
        onCheckStateUpdate,
        onApiCall,
        initializeAnimation: bulkAnimation.initializeAnimation,
        startCountdown: bulkAnimation.startCountdown,
        finalizeAnimation: bulkAnimation.finalizeAnimation,
        setIsProcessing: setIsRestoring,
        setIsLidOpen,
      });
    },
    [
      itemType,
      checkedItems,
      setCheckedItems,
      boardItems,
      deletedMemos,
      deletedTasks,
      restoreMemoMutation,
      restoreTaskMutation,
      bulkAnimation,
      setIsRestoring,
      setIsLidOpen,
    ],
  );

  const handleBulkRestore = useCallback(async () => {
    // checkedItemsから復元対象IDを抽出
    const rawTargetIds: number[] = [];
    checkedItems.forEach((id) => {
      if (typeof id === "number") {
        // checkedItemsに直接データベースIDが入っている場合
        rawTargetIds.push(id);
      } else {
        // 従来のoriginalId検索（念のため残す）
        const boardItem = boardItems.find((item) => item.itemId === id);
        if (boardItem) {
          const content = boardItem.content as DeletedMemo | DeletedTask;
          rawTargetIds.push(content.id);
        }
      }
    });

    // DOM順序でソート
    const { getMemoDisplayOrder, getTaskDisplayOrder } = await import(
      "@/src/utils/domUtils"
    );
    const domOrder =
      itemType === "memo" ? getMemoDisplayOrder() : getTaskDisplayOrder();
    const targetIds = rawTargetIds.sort((a, b) => {
      const aIndex = domOrder.indexOf(a);
      const bIndex = domOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // 復元の場合は1件からモーダル表示
    const threshold = 1;

    // 100件超えの場合は最初の100件のみ処理
    const actualTargetIds =
      targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds;
    const isLimitedRestore = targetIds.length > 100;

    // 復元ボタンを押した瞬間の状態設定
    bulkAnimation.setModalState(setIsRestoring, setIsLidOpen);

    if (isLimitedRestore) {
      // 100件制限のモーダル表示
      await bulkRestore.confirmBulkDelete(
        actualTargetIds,
        0, // 即座にモーダル表示
        async (ids: number[], isPartialRestore = false) => {
          await executeRestoreWithAnimation(
            ids,
            isPartialRestore,
            targetIds.length,
          );
        },
        `${targetIds.length}件選択されています。\n一度に復元できる上限は100件です。`,
        true, // isPartialRestore
      );
    } else {
      // 通常の確認モーダル
      await bulkRestore.confirmBulkDelete(
        actualTargetIds,
        threshold,
        async (ids: number[]) => {
          await executeRestoreWithAnimation(ids);
        },
      );
    }
  }, [
    checkedItems,
    boardItems,
    itemType,
    bulkRestore,
    executeRestoreWithAnimation,
    bulkAnimation,
    setIsRestoring,
    setIsLidOpen,
  ]);

  const RestoreModal: React.FC = () => (
    <BulkRestoreConfirmation
      isOpen={bulkRestore.isModalOpen}
      onClose={() => {
        bulkAnimation.handleModalCancel(setIsRestoring, setIsLidOpen);
        bulkRestore.handleCancel();
      }}
      onConfirm={async () => {
        await bulkRestore.handleConfirm();
      }}
      count={bulkRestore.targetIds.length}
      itemType={itemType}
      isLoading={bulkRestore.isDeleting}
      customMessage={bulkRestore.customMessage as string}
    />
  );

  // 現在の復元カウント
  const currentRestoreCount = checkedItems.size;
  const finalDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : currentRestoreCount;

  return {
    handleBulkRestore,
    RestoreModal,
    restoreButtonRef,
    currentDisplayCount: finalDisplayCount,
    isRestoreModalOpen: bulkRestore.isModalOpen,
  };
}
