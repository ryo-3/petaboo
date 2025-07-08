import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeleteNote, usePermanentDeleteNote } from "@/src/hooks/use-notes";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useEffect } from "react";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { notesApi } from "@/src/lib/api-client";
import { useBulkAnimation } from "@/src/hooks/use-bulk-animation";
import { executeWithAnimation } from "@/src/utils/bulkAnimationUtils";

interface UseMemosBulkDeleteProps {
  activeTab: "normal" | "deleted";
  checkedMemos: Set<number>;
  checkedDeletedMemos: Set<number>;
  setCheckedMemos: (memos: Set<number>) => void;
  setCheckedDeletedMemos: (memos: Set<number>) => void;
  notes?: Memo[];
  deletedNotes?: DeletedMemo[];
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
  notes,
  deletedNotes,
  localMemos, // eslint-disable-line @typescript-eslint/no-unused-vars
  onMemoDelete,
  deleteButtonRef,
  setIsDeleting,
  setIsLidOpen,
  viewMode = 'list', // eslint-disable-line @typescript-eslint/no-unused-vars
}: UseMemosBulkDeleteProps) {
  const deleteNoteMutation = useDeleteNote();
  const permanentDeleteNoteMutation = usePermanentDeleteNote();
  const bulkDelete = useBulkDelete();
  const { getToken } = useAuth();
  
  // 自動更新なしの削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteNoteWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await notesApi.deleteNote(id, token || undefined);
      return response.json();
    },
    // onSuccessなし（自動更新しない）
  });
  
  // 自動更新なしの完全削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const permanentDeleteNoteWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await notesApi.permanentDeleteNote(id, token || undefined);
      return response.json();
    },
    // onSuccessなし（自動更新しない）
  });
  
  // 共通のアニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: checkedMemos,
    checkedDeletedItems: checkedDeletedMemos,
  });

  // チェック状態のクリーンアップ - 削除されたメモのチェックを解除（部分削除中は無効）
  useEffect(() => {
    if (notes && !bulkAnimation.isPartialProcessing) {
      const allMemoIds = new Set(notes.map((m) => m.id));
      const newCheckedMemos = new Set(
        Array.from(checkedMemos).filter((id) => allMemoIds.has(id))
      );
      if (newCheckedMemos.size !== checkedMemos.size) {
        setCheckedMemos(newCheckedMemos);
      }
    }
  }, [notes, checkedMemos, setCheckedMemos, bulkAnimation.isPartialProcessing]);

  // 削除中フラグを外部で管理
  const isCurrentlyDeleting =
    deleteNoteMutation.isPending || permanentDeleteNoteMutation.isPending;

  useEffect(() => {
    // 削除中は自動クリーンアップを無効にする（部分削除中も無効）
    if (deletedNotes && !isCurrentlyDeleting && !bulkAnimation.isPartialProcessing) {
      const deletedMemoIds = new Set(deletedNotes.map((m) => m.id));
      const newCheckedDeletedMemos = new Set(
        Array.from(checkedDeletedMemos).filter((id) => deletedMemoIds.has(id))
      );
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos);
      }
    }
  }, [
    deletedNotes,
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
        await permanentDeleteNoteMutation.mutateAsync(id);
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

  const handleBulkDelete = async () => {
    const targetIds =
      activeTab === "deleted"
        ? Array.from(checkedDeletedMemos)
        : Array.from(checkedMemos);

    // メモの場合は1件からモーダル表示（削除済み・通常問わず）
    const threshold = 1;

    // 100件超えの場合は最初の100件のみ処理
    const actualTargetIds =
      targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds;
    const isLimitedDelete = targetIds.length > 100;

    // 削除ボタンを押した瞬間の状態設定（カウンター維持）
    bulkAnimation.setModalState(setIsDeleting, setIsLidOpen);

    console.log("🗑️ 削除開始:", {
      selected: targetIds.length,
      actualDelete: actualTargetIds.length,
      activeTab,
      isLimited: isLimitedDelete,
    });

    if (isLimitedDelete) {
      // 100件制限のモーダル表示
      await bulkDelete.confirmBulkDelete(
        actualTargetIds,
        0, // 即座にモーダル表示
        async (ids: number[], isPartialDelete = false) => {
          await executeDeleteWithAnimation(ids, isPartialDelete, targetIds.length);
        },
        `${targetIds.length}件選択されています。\\n一度に削除できる上限は100件です。`,
        true // isPartialDelete
      );
    } else {
      // 通常の確認モーダル
      await bulkDelete.confirmBulkDelete(
        actualTargetIds,
        threshold,
        async (ids: number[]) => {
          await executeDeleteWithAnimation(ids);
        }
      );
    }
  };

  const DeleteModal = () => (
    <BulkDeleteConfirmation
      isOpen={bulkDelete.isModalOpen}
      onClose={() => {
        bulkAnimation.handleModalCancel(setIsDeleting, setIsLidOpen);
        bulkDelete.handleCancel();
      }}
      onConfirm={async () => {
        console.log("Confirm modal");
        await bulkDelete.handleConfirm();
      }}
      count={bulkDelete.targetIds.length}
      itemType="memo"
      deleteType={activeTab === "deleted" ? "permanent" : "normal"}
      isLoading={bulkDelete.isDeleting}
      customMessage={bulkDelete.customMessage}
    />
  );

  // 現在の削除カウント（通常時は実際のサイズ、削除中はアニメーション用）
  const currentDeleteCount =
    activeTab === "deleted" ? checkedDeletedMemos.size : checkedMemos.size;
  const finalDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : currentDeleteCount;

  // デバッグログ
  console.log("🔄 削除カウンター状態:", {
    activeTab,
    isCountingActive: bulkAnimation.isCountingActive,
    displayCount: bulkAnimation.displayCount,
    currentDeleteCount,
    finalDisplayCount,
    checkedMemosSize: checkedMemos.size,
    checkedDeletedMemosSize: checkedDeletedMemos.size,
  });

  return {
    handleBulkDelete,
    DeleteModal,
    // カウンターアクティブ時はdisplayCount、それ以外は実際のカウント
    currentDisplayCount: finalDisplayCount,
  };
}
