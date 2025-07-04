import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeleteNote, usePermanentDeleteNote } from "@/src/hooks/use-notes";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import {
  animateMultipleItemsToTrash,
  animateMultipleItemsToTrashWithRect,
} from "@/src/utils/deleteAnimation";
import { useEffect, useRef } from "react";
import React from "react";

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
}

export function useMemosBulkDelete({
  activeTab,
  checkedMemos,
  checkedDeletedMemos,
  setCheckedMemos,
  setCheckedDeletedMemos,
  notes,
  deletedNotes,
  localMemos,
  onMemoDelete,
  deleteButtonRef,
  setIsDeleting,
  setIsLidOpen,
}: UseMemosBulkDeleteProps) {
  const deleteNoteMutation = useDeleteNote();
  const permanentDeleteNoteMutation = usePermanentDeleteNote();
  const bulkDelete = useBulkDelete();
  
  // タイマーIDを保持
  const timerRef = useRef<{ isDeleting?: NodeJS.Timeout; clearChecked?: NodeJS.Timeout }>({});

  // チェック状態が変更されたらタイマーをクリア
  useEffect(() => {
    if (checkedMemos.size > 0) {
      // 新しい選択があったらタイマーをクリア
      if (timerRef.current.clearChecked) {
        clearTimeout(timerRef.current.clearChecked);
        timerRef.current.clearChecked = undefined;
      }
      if (timerRef.current.isDeleting) {
        clearTimeout(timerRef.current.isDeleting);
        timerRef.current.isDeleting = undefined;
      }
    }
  }, [checkedMemos]);

  // チェック状態のクリーンアップ - 削除されたメモのチェックを解除
  useEffect(() => {
    if (notes) {
      const allMemoIds = new Set([
        ...notes.map((m) => m.id),
        ...localMemos.map((m) => m.id),
      ]);
      const newCheckedMemos = new Set(
        Array.from(checkedMemos).filter((id) => allMemoIds.has(id))
      );
      if (newCheckedMemos.size !== checkedMemos.size) {
        setCheckedMemos(newCheckedMemos);
      }
    }
  }, [notes, localMemos, checkedMemos, setCheckedMemos]);

  useEffect(() => {
    if (deletedNotes) {
      const deletedMemoIds = new Set(deletedNotes.map((m) => m.id));
      const newCheckedDeletedMemos = new Set(
        Array.from(checkedDeletedMemos).filter((id) => deletedMemoIds.has(id))
      );
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos);
      }
    }
  }, [deletedNotes, checkedDeletedMemos, setCheckedDeletedMemos]);

  // 共通の削除処理関数
  const executeDeleteWithAnimation = async (ids: number[]) => {
    // 削除ボタンの位置を取得
    const buttonRect = deleteButtonRef?.current?.getBoundingClientRect();
    
    console.log('✅ 削除処理開始:', { ids: ids.length, activeTab, hasButtonRect: !!buttonRect });
    
    // 通常メモの削除でアニメーションが必要な場合
    if (activeTab === "normal" && buttonRect) {
      console.log('🎬 アニメーション開始:', { ids: ids.length });
      
      // アニメーション実行（State更新は全アニメーション完了後）
      animateMultipleItemsToTrashWithRect(ids, buttonRect, async () => {
        console.log('🎬 アニメーション完了:', { ids: ids.length });
        
        // アニメーション完了後にAPI処理
        console.log('🌐 API開始:', { ids: ids.length });
        for (const id of ids) {
          try {
            await deleteNoteMutation.mutateAsync(id);
          } catch (error: any) {
            // 404エラーは既に削除済みの可能性があるので無視
            if (!error?.message?.includes('404')) {
              console.error(`メモ削除エラー (ID: ${id}):`, error);
            }
          }
        }
        console.log('🌐 API完了:', { ids: ids.length });
        
        // API完了後にState更新（これでリストから削除）
        console.log('🔄 State更新開始:', { ids: ids.length });
        if (onMemoDelete) {
          for (const id of ids) {
            onMemoDelete(id);
          }
        }
        console.log('🔄 State更新完了:', { ids: ids.length });
        
        // チェック状態をクリア
        setCheckedMemos(new Set());
        
        // 500ms後に蓋を閉じる
        setTimeout(() => {
          setIsLidOpen?.(false);
        }, 500);
        
        // 削除ボタンを3秒後に非表示
        console.log('⏰ タイマー設定:', { hasSetIsDeleting: !!setIsDeleting });
        timerRef.current.isDeleting = setTimeout(() => {
          console.log('🚫 削除ボタン非表示 実行', { hasSetIsDeleting: !!setIsDeleting });
          if (setIsDeleting) {
            setIsDeleting(false);
          } else {
            console.error('❌ setIsDeletingが未定義');
          }
        }, 3000);
      });
    } else {
      // アニメーションなしの場合は即座に処理
      // 削除済みアイテムの完全削除は即座にState更新
      if (activeTab === "normal" && onMemoDelete) {
        for (const id of ids) {
          onMemoDelete(id);
        }
      }
      // 選択状態をクリア (UI即座更新)
      if (activeTab === "normal") {
        setCheckedMemos(new Set());
      } else {
        setCheckedDeletedMemos(new Set());
      }
      
      // API処理を即座に実行
      for (const id of ids) {
        try {
          if (activeTab === "normal") {
            await deleteNoteMutation.mutateAsync(id);
          } else {
            await permanentDeleteNoteMutation.mutateAsync(id);
          }
        } catch (error) {
          console.error(`メモ削除エラー (ID: ${id}):`, error);
        }
      }
    }
  };

  const handleBulkDelete = async () => {
    const targetIds =
      activeTab === "normal"
        ? Array.from(checkedMemos)
        : Array.from(checkedDeletedMemos);

    // 削除済みメモの場合は1件から、通常メモの場合は10件からモーダル表示
    const threshold = activeTab === "deleted" ? 1 : 10;

    // 削除ボタンを押した瞬間に蓋を開く
    if (activeTab === "normal") {
      setIsDeleting?.(true);
      setIsLidOpen?.(true);
    }

    console.log('🗑️ 削除開始:', { targetIds: targetIds.length, activeTab });
    
    await bulkDelete.confirmBulkDelete(targetIds, threshold, executeDeleteWithAnimation);
  };

  const DeleteModal: React.FC = () => (
    <BulkDeleteConfirmation
      isOpen={bulkDelete.isModalOpen}
      onClose={() => {
        console.log('❌ キャンセル');
        // キャンセル時に蓋を閉じる
        setIsDeleting?.(false);
        setIsLidOpen?.(false);
        bulkDelete.handleCancel();
      }}
      onConfirm={async () => {
        console.log('👍 モーダル確認ボタン押下');
        await bulkDelete.handleConfirm(executeDeleteWithAnimation);
      }}
      count={bulkDelete.targetIds.length}
      itemType="memo"
      deleteType={activeTab === "normal" ? "normal" : "permanent"}
      isLoading={bulkDelete.isDeleting}
    />
  );

  return {
    handleBulkDelete,
    DeleteModal,
  };
}
