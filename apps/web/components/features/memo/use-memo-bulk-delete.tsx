import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeleteMemo, usePermanentDeleteMemo } from "@/src/hooks/use-memos";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useEffect } from "react";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { memosApi } from "@/src/lib/api-client";
import { useBulkAnimation } from "@/src/hooks/use-bulk-animation";
import { executeWithAnimation } from "@/src/utils/bulkAnimationUtils";
import { DeletionWarningMessage } from "@/components/ui/modals/deletion-warning-message";

interface UseMemosBulkDeleteProps {
  activeTab: "normal" | "deleted";
  checkedMemos: Set<number>;
  checkedDeletedMemos: Set<number>;
  setCheckedMemos: (memos: Set<number>) => void;
  setCheckedDeletedMemos: (memos: Set<number>) => void;
  memos?: Memo[];
  deletedMemos?: DeletedMemo[];
  localMemos: Memo[];
  onMemoDelete?: (id: number) => void;
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>;
  setIsDeleting?: (isDeleting: boolean) => void;
  setIsLidOpen?: (isOpen: boolean) => void;
  viewMode?: 'list' | 'card';
}

export function useMemosBulkDelete({
  activeTab,
  checkedMemos,
  checkedDeletedMemos,
  setCheckedMemos,
  setCheckedDeletedMemos,
  memos,
  deletedMemos,
  localMemos, // eslint-disable-line @typescript-eslint/no-unused-vars
  onMemoDelete,
  deleteButtonRef,
  setIsDeleting,
  setIsLidOpen,
  viewMode = 'list', // eslint-disable-line @typescript-eslint/no-unused-vars
}: UseMemosBulkDeleteProps) {
  const deleteNoteMutation = useDeleteMemo();
  const permanentDeleteNoteMutation = usePermanentDeleteMemo();
  const bulkDelete = useBulkDelete();
  const { getToken } = useAuth();
  
  // 自動更新なしの削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteNoteWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await memosApi.deleteNote(id, token || undefined);
      return response.json();
    },
    // onSuccessなし（自動更新しない）
  });
  
  // 自動更新なしの完全削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const permanentDeleteNoteWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await memosApi.permanentDeleteNote(String(id), token || undefined);
      return response.json();
    },
    // onSuccessなし（自動更新しない）
  });
  
  // 共通のアニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: checkedMemos,
    checkedDeletedItems: checkedDeletedMemos,
  });

  // アニメーションキャンセルイベントを監視
  useEffect(() => {
    const handleAnimationCancel = (event: CustomEvent) => {
      const { type, processType } = event.detail;
      
      // メモの削除処理のキャンセルの場合
      if (type === 'memo' && processType === 'delete') {
        bulkAnimation.cancelAnimation(setIsDeleting, setIsLidOpen);
      }
    };

    window.addEventListener('bulkAnimationCancel', handleAnimationCancel as EventListener);

    return () => {
      window.removeEventListener('bulkAnimationCancel', handleAnimationCancel as EventListener);
    };
  }, [bulkAnimation, setIsDeleting, setIsLidOpen]);

  // チェック状態のクリーンアップ - 削除されたメモのチェックを解除（部分削除中は無効）
  useEffect(() => {
    if (memos && !bulkAnimation.isPartialProcessing) {
      const allMemoIds = new Set(memos.map((m) => m.id));
      const newCheckedMemos = new Set(
        Array.from(checkedMemos).filter((id) => allMemoIds.has(id))
      );
      if (newCheckedMemos.size !== checkedMemos.size) {
        setCheckedMemos(newCheckedMemos);
      }
    }
  }, [memos, checkedMemos, setCheckedMemos, bulkAnimation.isPartialProcessing]);

  // 削除中フラグを外部で管理
  const isCurrentlyDeleting =
    deleteNoteMutation.isPending || permanentDeleteNoteMutation.isPending;

  useEffect(() => {
    // 削除中は自動クリーンアップを無効にする（部分削除中も無効）
    if (deletedMemos && !isCurrentlyDeleting && !bulkAnimation.isPartialProcessing) {
      const deletedMemoIds = new Set(deletedMemos.map((m) => m.id));
      const newCheckedDeletedMemos = new Set(
        Array.from(checkedDeletedMemos).filter((id) => deletedMemoIds.has(id))
      );
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos);
      }
    }
  }, [
    deletedMemos,
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    isCurrentlyDeleting,
    bulkAnimation.isPartialProcessing,
  ]);

  // 共通の削除処理関数（メモ側と同じパターン）
  const executeDeleteWithAnimation = async (
    ids: number[],
    isPartialDelete = false,
    originalTotalCount?: number
  ) => {
    const onStateUpdate = (id: number) => {
      if (activeTab !== "deleted" && onMemoDelete) {
        onMemoDelete(id);
      }
    };

    const onCheckStateUpdate = (ids: number[], isPartial: boolean) => {
      if (isPartial) {
        if (activeTab === "deleted") {
          const newCheckedDeletedMemos = new Set(checkedDeletedMemos);
          ids.forEach((id) => newCheckedDeletedMemos.delete(id));
          setCheckedDeletedMemos(newCheckedDeletedMemos);
        } else {
          const newCheckedMemos = new Set(checkedMemos);
          ids.forEach((id) => newCheckedMemos.delete(id));
          setCheckedMemos(newCheckedMemos);
        }
      } else {
        if (activeTab === "deleted") {
          setCheckedDeletedMemos(new Set());
        } else {
          setCheckedMemos(new Set());
        }
      }
    };

    const onApiCall = async (id: number) => {
      if (activeTab === "deleted") {
        // 削除済みメモの場合はoriginalIdを使用
        const deletedMemo = deletedMemos?.find(memo => memo.id === id);
        if (deletedMemo) {
          await permanentDeleteNoteMutation.mutateAsync(deletedMemo.originalId);
        } else {
          // 対象が見つからない場合もアニメーションの一貫性のため処理を継続
        }
      } else {
        await deleteNoteMutation.mutateAsync(id);
      }
    };

    await executeWithAnimation({
      ids,
      isPartial: isPartialDelete,
      originalTotalCount,
      buttonRef: deleteButtonRef,
      dataAttribute: "data-memo-id",
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

  // ステータス別カウントを取得する関数（メモ版）
  const getStatusBreakdown = (memoIds: number[]) => {
    if (activeTab === "deleted") {
      return [{ status: 'deleted', label: '削除済み', count: memoIds.length, color: 'bg-red-600' }];
    }
    
    // メモは全て通常メモとして扱う
    return [{ status: 'normal', label: '通常', count: memoIds.length, color: 'bg-zinc-500' }];
  };

  // カスタムメッセージコンポーネント（メモ版）
  const MemoDeleteMessage = ({ memoIds, currentTabMemoIds }: { memoIds: number[]; currentTabMemoIds: number[] }) => {
    const allStatusBreakdown = getStatusBreakdown(memoIds);
    const currentTabStatusBreakdown = getStatusBreakdown(currentTabMemoIds);
    const isLimited = currentTabMemoIds.length > 100;
    
    // 他のタブにも選択アイテムがあるかチェック（削除済みタブの場合は通常タブをチェック）
    const hasOtherTabItems = activeTab === "deleted" 
      ? checkedMemos.size > 0 
      : checkedDeletedMemos.size > 0;
    
    return (
      <DeletionWarningMessage
        hasOtherTabItems={hasOtherTabItems}
        isLimited={isLimited}
        statusBreakdown={hasOtherTabItems ? currentTabStatusBreakdown : allStatusBreakdown}
        showStatusBreakdown={true}
        isPermanentDelete={activeTab === "deleted"}
      />
    );
  };

  const handleBulkDelete = async () => {
    const rawTargetIds =
      activeTab === "deleted"
        ? Array.from(checkedDeletedMemos)
        : Array.from(checkedMemos);

    // 現在のタブに表示されているメモのIDのみを抽出
    const { getMemoDisplayOrder } = await import('@/src/utils/domUtils');
    const domOrder = getMemoDisplayOrder();
    const currentTabMemoIds = rawTargetIds.filter(id => domOrder.includes(id));
    
    // DOM順序でソート
    const targetIds = currentTabMemoIds.sort((a, b) => {
      const aIndex = domOrder.indexOf(a);
      const bIndex = domOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // メモの場合は1件からモーダル表示（削除済み・通常問わず）
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
          await executeDeleteWithAnimation(ids, isPartialDelete, targetIds.length);
        },
        <MemoDeleteMessage memoIds={rawTargetIds} currentTabMemoIds={targetIds} />,
        true // isPartialDelete
      );
    } else {
      // 通常の確認モーダル
      await bulkDelete.confirmBulkDelete(
        actualTargetIds,
        threshold,
        async (ids: number[]) => {
          await executeDeleteWithAnimation(ids);
        },
        <MemoDeleteMessage memoIds={rawTargetIds} currentTabMemoIds={targetIds} />
      );
    }
  };

  const DeleteModal = () => {
    const customTitle = activeTab === "deleted" 
      ? "メモの完全削除" 
      : "メモを削除";
    
    
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
        itemType="memo"
        deleteType={activeTab === "deleted" ? "permanent" : "normal"}
        isLoading={bulkDelete.isDeleting}
        customMessage={bulkDelete.customMessage}
        customTitle={customTitle}
      />
    );
  };

  // 現在の削除カウント（通常時は実際のサイズ、削除中はアニメーション用）
  const currentDeleteCount =
    activeTab === "deleted" ? checkedDeletedMemos.size : checkedMemos.size;
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
