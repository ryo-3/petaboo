import { useEffect, useRef } from "react";
import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { UseMutationResult } from "@tanstack/react-query";
import { useBulkAnimation } from "@/src/hooks/use-bulk-animation";
import { executeWithAnimation } from "@/src/utils/bulkAnimationUtils";
import { DeletionWarningMessage } from "@/components/ui/modals/deletion-warning-message";
import React from "react";
import type { BaseItemFields, TeamCreatorFields } from "@/src/types/common";
import type { Task } from "@/src/types/task";

// アイテム型の基本インターフェース
type BaseItem = BaseItemFields & TeamCreatorFields;
type DeletedItem = BaseItem & { deletedAt: number };

// API関数の型定義
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ApiMethods<_T extends BaseItem> {
  delete: (options?: {
    teamMode?: boolean;
    teamId?: number;
  }) => UseMutationResult<unknown, unknown, number>;
  permanentDelete: () => UseMutationResult<unknown, unknown, string>;
  deleteWithoutUpdate: (token: string | null) => {
    mutationFn: (id: number) => Promise<unknown>;
  };
  permanentDeleteWithoutUpdate: (token: string | null) => {
    mutationFn: (id: number) => Promise<unknown>;
  };
}

interface UseBulkDeleteUnifiedProps<
  T extends BaseItem,
  D extends DeletedItem,
  Tab extends string,
> {
  activeTab: Tab;
  checkedItems: Set<number>;
  checkedDeletedItems: Set<number>;
  setCheckedItems: (items: Set<number>) => void;
  setCheckedDeletedItems: (items: Set<number>) => void;
  items?: T[];
  deletedItems?: D[];
  onItemDelete?: (id: number) => void;
  onDeletedItemDelete?: (id: number) => void; // メモ専用（オプション）
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>;
  setIsDeleting?: (isDeleting: boolean) => void;
  setIsLidOpen?: (isOpen: boolean) => void;
  apiMethods: ApiMethods<T>;
  itemType: "memo" | "task";
  dataAttribute: string; // "data-memo-id" | "data-task-id"
  getDisplayOrder: () => Promise<{ getDomOrder: () => number[] }>;
  getStatusBreakdown: (
    itemIds: number[],
    items?: T[],
  ) => Array<{
    status: string;
    label: string;
    count: number;
    color: string;
  }>;
  deletedTabKey: string; // "deleted"
}

export function useBulkDeleteUnified<
  T extends BaseItem,
  D extends DeletedItem,
  Tab extends string,
>({
  activeTab,
  checkedItems,
  checkedDeletedItems,
  setCheckedItems,
  setCheckedDeletedItems,
  items,
  deletedItems,
  onItemDelete,
  onDeletedItemDelete,
  deleteButtonRef,
  setIsDeleting,
  setIsLidOpen,
  apiMethods,
  itemType,
  dataAttribute,
  getDisplayOrder,
  getStatusBreakdown,
  deletedTabKey,
}: UseBulkDeleteUnifiedProps<T, D, Tab>) {
  const deleteItemMutation = apiMethods.delete();
  const permanentDeleteItemMutation = apiMethods.permanentDelete();
  const bulkDelete = useBulkDelete();

  // 自動更新なしの削除API - 今後の最適化で使用予定（現在は未使用）
  // const deleteItemWithoutUpdate = useMutation(
  //   apiMethods.deleteWithoutUpdate(null),
  // );

  // 自動更新なしの完全削除API - 今後の最適化で使用予定（現在は未使用）
  // const permanentDeleteItemWithoutUpdate = useMutation(
  //   apiMethods.permanentDeleteWithoutUpdate(null),
  // );

  // 共通のアニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems,
    checkedDeletedItems,
  });

  // タブ切り替え時のアニメーションキャンセル
  const previousTabRef = useRef(activeTab);

  useEffect(() => {
    // 前回と異なるタブに切り替わった場合のみキャンセル
    if (previousTabRef.current !== activeTab) {
      bulkAnimation.cancelAnimation(setIsDeleting, setIsLidOpen);
    }
    // 現在のタブを保存
    previousTabRef.current = activeTab;
  }, [activeTab, bulkAnimation, setIsDeleting, setIsLidOpen]);

  // アニメーションキャンセルイベントを監視
  useEffect(() => {
    const handleAnimationCancel = (event: CustomEvent) => {
      const { type, processType } = event.detail;

      // 対象アイテムタイプの削除処理のキャンセルの場合
      if (type === itemType && processType === "delete") {
        bulkAnimation.cancelAnimation(setIsDeleting, setIsLidOpen);
      }
    };

    window.addEventListener(
      "bulkAnimationCancel",
      handleAnimationCancel as EventListener,
    );

    return () => {
      window.removeEventListener(
        "bulkAnimationCancel",
        handleAnimationCancel as EventListener,
      );
    };
  }, [bulkAnimation, setIsDeleting, setIsLidOpen, itemType]);

  // チェック状態のクリーンアップ - 削除されたアイテムのチェックを解除（部分削除中は無効）
  useEffect(() => {
    if (items && !bulkAnimation.isPartialProcessing) {
      const allItemIds = new Set(items.map((item) => item.id));
      const newCheckedItems = new Set(
        Array.from(checkedItems).filter((id) => allItemIds.has(id)),
      );
      if (newCheckedItems.size !== checkedItems.size) {
        setCheckedItems(newCheckedItems);
      }
    }
  }, [items, checkedItems, setCheckedItems, bulkAnimation.isPartialProcessing]);

  // 削除中フラグを外部で管理
  const isCurrentlyDeleting =
    deleteItemMutation.isPending || permanentDeleteItemMutation.isPending;

  useEffect(() => {
    // 削除中は自動クリーンアップを無効にする（部分削除中も無効）
    if (
      deletedItems &&
      !isCurrentlyDeleting &&
      !bulkAnimation.isPartialProcessing
    ) {
      const deletedItemIds = new Set(deletedItems.map((item) => item.id));
      const newCheckedDeletedItems = new Set(
        Array.from(checkedDeletedItems).filter((id) => deletedItemIds.has(id)),
      );
      if (newCheckedDeletedItems.size !== checkedDeletedItems.size) {
        setCheckedDeletedItems(newCheckedDeletedItems);
      }
    }
  }, [
    deletedItems,
    checkedDeletedItems,
    setCheckedDeletedItems,
    isCurrentlyDeleting,
    bulkAnimation.isPartialProcessing,
  ]);

  // 共通の削除処理関数
  const executeDeleteWithAnimation = async (
    ids: number[],
    isPartialDelete = false,
    originalTotalCount?: number,
  ) => {
    const onStateUpdate = (id: number) => {
      if (activeTab === deletedTabKey && onDeletedItemDelete) {
        onDeletedItemDelete(id);
      } else if (activeTab !== deletedTabKey && onItemDelete) {
        onItemDelete(id);
      }
    };

    const onCheckStateUpdate = (ids: number[], isPartial: boolean) => {
      if (isPartial) {
        if (activeTab === deletedTabKey) {
          const newCheckedDeletedItems = new Set(checkedDeletedItems);
          ids.forEach((id) => newCheckedDeletedItems.delete(id));
          setCheckedDeletedItems(newCheckedDeletedItems);
        } else {
          const newCheckedItems = new Set(checkedItems);
          ids.forEach((id) => newCheckedItems.delete(id));
          setCheckedItems(newCheckedItems);
        }
      } else {
        if (activeTab === deletedTabKey) {
          setCheckedDeletedItems(new Set());
        } else {
          setCheckedItems(new Set());
        }
      }
    };

    const onApiCall = async (id: number) => {
      if (activeTab === deletedTabKey) {
        // 削除済みアイテムの場合はdisplayIdを使用
        const deletedItem = deletedItems?.find((item) => item.id === id);
        if (deletedItem && deletedItem.displayId) {
          await permanentDeleteItemMutation.mutateAsync(deletedItem.displayId);
        } else {
          // 対象が見つからない場合もアニメーションの一貫性のため処理を継続
        }
      } else {
        await deleteItemMutation.mutateAsync(id);
      }
    };

    await executeWithAnimation({
      ids,
      isPartial: isPartialDelete,
      originalTotalCount,
      buttonRef: deleteButtonRef,
      dataAttribute,
      onStateUpdate,
      onCheckStateUpdate,
      onApiCall,
      initializeAnimation: bulkAnimation.initializeAnimation,
      startCountdown: bulkAnimation.startCountdown,
      finalizeAnimation: bulkAnimation.finalizeAnimation,
      setIsProcessing: setIsDeleting,
      setIsLidOpen,
    });
  };

  // カスタムメッセージコンポーネント
  const DeleteMessage = ({
    itemIds,
    currentTabItemIds,
  }: {
    itemIds: number[];
    currentTabItemIds: number[];
  }) => {
    const allStatusBreakdown = getStatusBreakdown(itemIds, items);
    const currentTabStatusBreakdown = getStatusBreakdown(
      currentTabItemIds,
      items,
    );
    const isLimited = currentTabItemIds.length > 100;

    // 他のタブにも選択アイテムがあるかチェック
    const hasOtherTabItems =
      activeTab === deletedTabKey
        ? checkedItems.size > 0
        : itemType === "memo"
          ? checkedDeletedItems.size > 0
          : itemIds.length > currentTabItemIds.length;

    return (
      <DeletionWarningMessage
        hasOtherTabItems={hasOtherTabItems}
        isLimited={isLimited}
        statusBreakdown={
          hasOtherTabItems ? currentTabStatusBreakdown : allStatusBreakdown
        }
        showStatusBreakdown={true}
        isPermanentDelete={activeTab === deletedTabKey}
      />
    );
  };

  const handleBulkDelete = async () => {
    const rawTargetIds =
      activeTab === deletedTabKey
        ? Array.from(checkedDeletedItems)
        : Array.from(checkedItems);

    // 現在のタブに表示されているアイテムのIDのみを抽出
    const { getDomOrder } = await getDisplayOrder();
    const domOrder = getDomOrder();
    const currentTabItemIds = rawTargetIds.filter((id) =>
      domOrder.includes(id),
    );

    // DOM順序でソート
    const targetIds = currentTabItemIds.sort((a, b) => {
      const aIndex = domOrder.indexOf(a);
      const bIndex = domOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // 1件からモーダル表示
    const threshold = 1;

    // 100件超えの場合は最初の100件のみ処理（DOM順序での最初の100件）
    const actualTargetIds =
      targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds;
    const isLimitedDelete = targetIds.length > 100;

    // 削除ボタンを押した瞬間の状態設定（カウンター維持）
    bulkAnimation.setModalState(setIsDeleting, setIsLidOpen);

    if (isLimitedDelete) {
      // 100件制限のモーダル表示
      await bulkDelete.confirmBulkDelete(
        actualTargetIds,
        0, // 即座にモーダル表示
        async (ids: number[], isPartialDelete = false) => {
          await executeDeleteWithAnimation(
            ids,
            isPartialDelete,
            targetIds.length,
          );
        },
        <DeleteMessage itemIds={rawTargetIds} currentTabItemIds={targetIds} />,
        true, // isPartialDelete
      );
    } else {
      // 通常の確認モーダル
      await bulkDelete.confirmBulkDelete(
        actualTargetIds,
        threshold,
        async (ids: number[]) => {
          await executeDeleteWithAnimation(ids);
        },
        <DeleteMessage itemIds={rawTargetIds} currentTabItemIds={targetIds} />,
      );
    }
  };

  const DeleteModal = () => {
    const customTitle =
      activeTab === deletedTabKey
        ? `${itemType === "memo" ? "メモ" : "タスク"}の完全削除`
        : `${itemType === "memo" ? "メモ" : "タスク"}を削除`;

    return (
      <BulkDeleteConfirmation
        isOpen={bulkDelete.isModalOpen}
        onClose={() => {
          bulkAnimation.handleModalCancel(setIsDeleting, setIsLidOpen);
          bulkDelete.handleCancel();
        }}
        onConfirm={async () => {
          await bulkDelete.handleConfirm();
        }}
        count={bulkDelete.targetIds.length}
        itemType={itemType}
        deleteType={activeTab === deletedTabKey ? "permanent" : "normal"}
        isLoading={bulkDelete.isDeleting}
        customMessage={bulkDelete.customMessage}
        customTitle={customTitle}
      />
    );
  };

  // 現在の削除カウント計算
  const getCurrentDeleteCount = () => {
    if (activeTab === deletedTabKey) {
      return checkedDeletedItems.size;
    }

    if (itemType === "memo") {
      return checkedItems.size;
    }

    // タスクの場合、現在表示されているタスクのうち選択されているもののみカウント
    if (itemType === "task" && items) {
      // 型キャスト: BaseItem[] → Task[]
      // NOTE: itemType === "task" の場合、items は実際には Task[] なので安全
      // ジェネリクスの制約上、ここで型キャストが必要
      const allItems = items as unknown as Task[];
      const currentTabItems = allItems.filter(
        (item) => item.status === activeTab,
      );
      const currentTabItemIds = currentTabItems.map((item) => item.id);
      const selectedCurrentTabItems = Array.from(checkedItems).filter((id) =>
        currentTabItemIds.includes(id),
      );
      return selectedCurrentTabItems.length;
    }

    return checkedItems.size;
  };

  // 現在の削除カウント（通常時は実際のサイズ、削除中はアニメーション用）
  const currentDeleteCount = getCurrentDeleteCount();
  const finalDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : currentDeleteCount;

  return {
    handleBulkDelete,
    DeleteModal,
    // カウンターアクティブ時はdisplayCount、それ以外は実際のカウント
    currentDisplayCount: finalDisplayCount,
    bulkAnimation,
  };
}
