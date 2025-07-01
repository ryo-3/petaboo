import { useState } from 'react'
import { useDeleteNote, usePermanentDeleteNote } from '@/src/hooks/use-notes'
import { useBulkDelete } from '@/components/ui/modals'

interface UseMemosBulkDeleteProps {
  activeTab: 'normal' | 'deleted'
  checkedMemos: Set<number>
  checkedDeletedMemos: Set<number>
  onClearSelection: (tab: 'normal' | 'deleted') => void
}

export function useMemosBulkDelete({
  activeTab,
  checkedMemos,
  checkedDeletedMemos,
  onClearSelection
}: UseMemosBulkDeleteProps) {
  const deleteNoteMutation = useDeleteNote()
  const permanentDeleteNoteMutation = usePermanentDeleteNote()
  const bulkDelete = useBulkDelete()

  const handleBulkDelete = async () => {
    const targetIds = activeTab === "normal" 
      ? Array.from(checkedMemos)
      : Array.from(checkedDeletedMemos)

    await bulkDelete.confirmBulkDelete(targetIds, 10, async (ids) => {
      // 順次削除処理
      for (const id of ids) {
        if (activeTab === "normal") {
          await deleteNoteMutation.mutateAsync(id)
        } else {
          await permanentDeleteNoteMutation.mutateAsync(id)
        }
      }

      // 選択状態をクリア
      onClearSelection(activeTab)
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
          onClearSelection(activeTab)
        })
      }
    }
  }
}