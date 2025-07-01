import { useState } from 'react'
import { usePermanentDeleteNote, useRestoreNote } from '@/src/hooks/use-notes'
import type { DeletedMemo } from '@/src/types/memo'

interface UseDeletedMemoActionsProps {
  memo: DeletedMemo
  onClose: () => void
}

export function useDeletedMemoActions({ memo, onClose }: UseDeletedMemoActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const permanentDeleteNote = usePermanentDeleteNote()
  const restoreNote = useRestoreNote()

  const handlePermanentDelete = async () => {
    try {
      await permanentDeleteNote.mutateAsync(memo.id)
      setShowDeleteModal(false)
      onClose() // 完全削除後に閉じる
    } catch (error) {
      console.error('完全削除に失敗しました:', error)
      alert('完全削除に失敗しました。')
    }
  }

  const handleRestore = async () => {
    try {
      await restoreNote.mutateAsync(memo.id)
      onClose() // 復元後に閉じる
    } catch (error) {
      console.error('復元に失敗しました:', error)
      alert('復元に失敗しました。')
    }
  }

  const showDeleteConfirmation = () => {
    setShowDeleteModal(true)
  }

  const hideDeleteConfirmation = () => {
    setShowDeleteModal(false)
  }

  return {
    // Actions
    handlePermanentDelete,
    handleRestore,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    
    // Modal state
    showDeleteModal,
    
    // Loading states
    isDeleting: permanentDeleteNote.isPending,
    isRestoring: restoreNote.isPending
  }
}