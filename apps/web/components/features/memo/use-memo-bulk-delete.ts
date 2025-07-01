import { useEffect } from 'react'
import { useDeleteNote, usePermanentDeleteNote } from '@/src/hooks/use-notes'
import { useBulkDelete } from '@/components/ui/modals'
import type { Memo, DeletedMemo } from '@/src/types/memo'

interface UseMemosBulkDeleteProps {
  activeTab: 'normal' | 'deleted'
  checkedMemos: Set<number>
  checkedDeletedMemos: Set<number>
  setCheckedMemos: (memos: Set<number>) => void
  setCheckedDeletedMemos: (memos: Set<number>) => void
  notes?: Memo[]
  deletedNotes?: DeletedMemo[]
  localMemos: Memo[]
}

export function useMemosBulkDelete({
  activeTab,
  checkedMemos,
  checkedDeletedMemos,
  setCheckedMemos,
  setCheckedDeletedMemos,
  notes,
  deletedNotes,
  localMemos
}: UseMemosBulkDeleteProps) {
  const deleteNoteMutation = useDeleteNote()
  const permanentDeleteNoteMutation = usePermanentDeleteNote()
  const bulkDelete = useBulkDelete()

  // チェック状態のクリーンアップ - 削除されたメモのチェックを解除
  useEffect(() => {
    if (notes) {
      const allMemoIds = new Set([...(notes.map(m => m.id)), ...localMemos.map(m => m.id)])
      const newCheckedMemos = new Set(Array.from(checkedMemos).filter(id => allMemoIds.has(id)))
      if (newCheckedMemos.size !== checkedMemos.size) {
        setCheckedMemos(newCheckedMemos)
      }
    }
  }, [notes, localMemos, checkedMemos, setCheckedMemos])

  useEffect(() => {
    if (deletedNotes) {
      const deletedMemoIds = new Set(deletedNotes.map(m => m.id))
      const newCheckedDeletedMemos = new Set(Array.from(checkedDeletedMemos).filter(id => deletedMemoIds.has(id)))
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos)
      }
    }
  }, [deletedNotes, checkedDeletedMemos, setCheckedDeletedMemos])

  const handleBulkDelete = async () => {
    const targetIds = activeTab === "normal" 
      ? Array.from(checkedMemos)
      : Array.from(checkedDeletedMemos)

    // 削除済みメモの場合は1件から、通常メモの場合は10件からモーダル表示
    const threshold = activeTab === "deleted" ? 1 : 10

    await bulkDelete.confirmBulkDelete(targetIds, threshold, async (ids) => {
      // 順次削除処理
      for (const id of ids) {
        if (activeTab === "normal") {
          await deleteNoteMutation.mutateAsync(id)
        } else {
          await permanentDeleteNoteMutation.mutateAsync(id)
        }
      }

      // 選択状態をクリア
      if (activeTab === 'normal') {
        setCheckedMemos(new Set())
      } else {
        setCheckedDeletedMemos(new Set())
      }
      console.log(`${ids.length}件のメモを削除しました`)
    })
  }

  return {
    handleBulkDelete,
    bulkDeleteState: {
      isModalOpen: bulkDelete.isModalOpen,
      targetIds: bulkDelete.targetIds,
      isDeleting: bulkDelete.isDeleting,
      handleCancel: bulkDelete.handleCancel,
      handleConfirm: async () => {
        await bulkDelete.handleConfirm(async (ids) => {
          // 順次削除処理
          for (const id of ids) {
            if (activeTab === "normal") {
              await deleteNoteMutation.mutateAsync(id)
            } else {
              await permanentDeleteNoteMutation.mutateAsync(id)
            }
          }

          // 選択状態をクリア
          if (activeTab === 'normal') {
            setCheckedMemos(new Set())
          } else {
            setCheckedDeletedMemos(new Set())
          }
        })
      }
    }
  }
}