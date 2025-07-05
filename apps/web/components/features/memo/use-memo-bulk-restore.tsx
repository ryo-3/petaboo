import { useEffect } from 'react'
import { useRestoreNote } from '@/src/hooks/use-notes'
import { useBulkDelete, BulkRestoreConfirmation } from '@/components/ui/modals'
import { animateItemsRestoreFadeOut } from '@/src/utils/deleteAnimation'
import type { DeletedMemo } from '@/src/types/memo'
import React from 'react'

interface UseMemosBulkRestoreProps {
  checkedDeletedMemos: Set<number>
  setCheckedDeletedMemos: (memos: Set<number>) => void
  deletedNotes?: DeletedMemo[]
  onDeletedMemoRestore?: (id: number) => void
}

export function useMemosBulkRestore({
  checkedDeletedMemos,
  setCheckedDeletedMemos,
  deletedNotes,
  onDeletedMemoRestore
}: UseMemosBulkRestoreProps) {
  const restoreNoteMutation = useRestoreNote()
  const bulkRestore = useBulkDelete() // 削除と同じモーダルロジックを使用

  // チェック状態のクリーンアップ - 復元されたメモのチェックを解除
  useEffect(() => {
    if (deletedNotes) {
      const deletedMemoIds = new Set(deletedNotes.map(m => m.id))
      const newCheckedDeletedMemos = new Set(Array.from(checkedDeletedMemos).filter(id => deletedMemoIds.has(id)))
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos)
      }
    }
  }, [deletedNotes, checkedDeletedMemos, setCheckedDeletedMemos])

  // 共通の復元処理関数
  const executeRestoreWithAnimation = async (ids: number[]) => {
    console.log('✅ 復元処理開始:', { ids: ids.length });
    
    // フェードアウトアニメーション実行
    animateItemsRestoreFadeOut(ids, async () => {
      console.log('🌟 フェードアウト完了:', { ids: ids.length });
      
      // アニメーション完了後にState更新（これでリストから削除）
      console.log('🔄 State更新開始:', { ids: ids.length });
      for (const id of ids) {
        onDeletedMemoRestore?.(id);
      }
      console.log('🔄 State更新完了:', { ids: ids.length });
      
      // 選択状態をクリア
      setCheckedDeletedMemos(new Set());
      
      // API処理を実行
      console.log('🌐 API開始:', { ids: ids.length });
      for (const id of ids) {
        try {
          await restoreNoteMutation.mutateAsync(id);
        } catch (error) {
          console.error(`メモ復元エラー (ID: ${id}):`, error);
        }
      }
      console.log('🌐 API完了:', { ids: ids.length });
    });
  };

  const handleBulkRestore = async () => {
    const targetIds = Array.from(checkedDeletedMemos)

    // メモの場合は1件からモーダル表示
    const threshold = 1

    console.log('🔄 復元開始:', { targetIds: targetIds.length });
    
    await bulkRestore.confirmBulkDelete(targetIds, threshold, executeRestoreWithAnimation)
  }

  const RestoreModal: React.FC = () => (
    <BulkRestoreConfirmation
      isOpen={bulkRestore.isModalOpen}
      onClose={bulkRestore.handleCancel}
      onConfirm={async () => {
        console.log('👍 モーダル復元確認ボタン押下');
        await bulkRestore.handleConfirm(executeRestoreWithAnimation);
      }}
      count={bulkRestore.targetIds.length}
      itemType="memo"
      isLoading={bulkRestore.isDeleting}
    />
  );

  return {
    handleBulkRestore,
    RestoreModal,
  }
}