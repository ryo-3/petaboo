import { useEffect, useRef } from "react";
import { useRestoreTask } from "@/src/hooks/use-tasks";
import { useBulkDelete, BulkRestoreConfirmation } from "@/components/ui/modals";
import type { DeletedTask } from "@/src/types/task";
import React from "react";
import { useBulkAnimation } from "@/src/hooks/use-bulk-animation";
import { executeWithAnimation } from "@/src/utils/bulkAnimationUtils";

interface UseTasksBulkRestoreProps {
  activeTab: "normal" | "deleted";
  checkedDeletedTasks: Set<number>;
  setCheckedDeletedTasks: (tasks: Set<number>) => void;
  deletedTasks?: DeletedTask[];
  onDeletedTaskRestore?: (id: number) => void;
  restoreButtonRef?: React.RefObject<HTMLButtonElement | null>;
  setIsRestoring?: (isRestoring: boolean) => void;
  setIsLidOpen?: (isOpen: boolean) => void;
}

export function useTasksBulkRestore({
  activeTab,
  checkedDeletedTasks,
  setCheckedDeletedTasks,
  deletedTasks,
  onDeletedTaskRestore,
  restoreButtonRef,
  setIsRestoring,
  setIsLidOpen,
}: UseTasksBulkRestoreProps) {
  const restoreTaskMutation = useRestoreTask();
  const bulkRestore = useBulkDelete(); // 削除と同じモーダルロジックを使用

  // 共通のアニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: new Set(),
    checkedDeletedItems: checkedDeletedTasks,
  });

  // タブ切り替え時のアニメーションキャンセル
  const previousTabRef = useRef(activeTab);

  useEffect(() => {
    // 前回と異なるタブに切り替わった場合のみキャンセル
    if (previousTabRef.current !== activeTab) {
      bulkAnimation.cancelAnimation(setIsRestoring, setIsLidOpen);
    }
    // 現在のタブを保存
    previousTabRef.current = activeTab;
  }, [activeTab, bulkAnimation, setIsRestoring, setIsLidOpen]);

  // チェック状態のクリーンアップ - 復元されたタスクのチェックを解除（部分復元中は無効）
  useEffect(() => {
    if (deletedTasks && !bulkAnimation.isPartialProcessing) {
      const deletedTaskIds = new Set(deletedTasks.map((t) => t.id));
      const newCheckedDeletedTasks = new Set(
        Array.from(checkedDeletedTasks).filter((id) => deletedTaskIds.has(id)),
      );
      if (newCheckedDeletedTasks.size !== checkedDeletedTasks.size) {
        setCheckedDeletedTasks(newCheckedDeletedTasks);
      }
    }
  }, [
    deletedTasks,
    checkedDeletedTasks,
    setCheckedDeletedTasks,
    bulkAnimation.isPartialProcessing,
  ]);

  // 共通の復元処理関数（共通ロジック使用）
  const executeRestoreWithAnimation = async (
    ids: number[],
    isPartialRestore = false,
    originalTotalCount?: number,
  ) => {
    const onStateUpdate = (id: number) => {
      if (onDeletedTaskRestore) {
        onDeletedTaskRestore(id);
      }
    };

    const onCheckStateUpdate = (ids: number[], isPartial: boolean) => {
      if (isPartial) {
        const newCheckedDeletedTasks = new Set(checkedDeletedTasks);
        ids.forEach((id) => newCheckedDeletedTasks.delete(id));
        setCheckedDeletedTasks(newCheckedDeletedTasks);
      } else {
        setCheckedDeletedTasks(new Set());
      }
    };

    const onApiCall = async (id: number) => {
      // idからoriginalIdに変換
      const deletedTask = deletedTasks?.find((task) => task.id === id);
      if (!deletedTask) {
        throw new Error(`削除済みタスクが見つかりません: ID ${id}`);
      }
      await restoreTaskMutation.mutateAsync(deletedTask.originalId);
    };

    await executeWithAnimation({
      ids,
      isPartial: isPartialRestore,
      originalTotalCount,
      buttonRef: restoreButtonRef,
      dataAttribute: "data-task-id",
      onStateUpdate,
      onCheckStateUpdate,
      onApiCall,
      initializeAnimation: bulkAnimation.initializeAnimation,
      startCountdown: bulkAnimation.startCountdown,
      finalizeAnimation: bulkAnimation.finalizeAnimation,
      setIsProcessing: setIsRestoring,
      setIsLidOpen,
    });
  };

  const handleBulkRestore = async () => {
    const rawTargetIds = Array.from(checkedDeletedTasks);

    // DOM順序でソート（個別チェック変更でSet順序が崩れるため）
    const { getTaskDisplayOrder } = await import("@/src/utils/domUtils");
    const domOrder = getTaskDisplayOrder();
    const targetIds = rawTargetIds.sort((a, b) => {
      const aIndex = domOrder.indexOf(a);
      const bIndex = domOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // 復元の場合は1件からモーダル表示
    const threshold = 1;

    // 100件超えの場合は最初の100件のみ処理（DOM順序での最初の100件）
    const actualTargetIds =
      targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds;
    const isLimitedRestore = targetIds.length > 100;

    // 復元ボタンを押した瞬間の状態設定（カウンター維持）
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
  };

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
      itemType="task"
      isLoading={bulkRestore.isDeleting}
      customMessage={bulkRestore.customMessage as string}
    />
  );

  // 現在の復元カウント（通常時は実際のサイズ、復元中はアニメーション用）
  const currentRestoreCount = checkedDeletedTasks.size;
  const finalDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : currentRestoreCount;

  // デバッグログ

  return {
    handleBulkRestore,
    RestoreModal,
    // カウンターアクティブ時はdisplayCount、それ以外は実際のカウント
    currentDisplayCount: finalDisplayCount,
    // 復元モーダルの状態
    isRestoreModalOpen: bulkRestore.isModalOpen,
  };
}
