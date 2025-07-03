import { useState } from 'react'
import { usePermanentDeleteNote, useRestoreNote } from '@/src/hooks/use-notes'
import type { DeletedMemo } from '@/src/types/memo'

interface UseDeletedMemoActionsProps {
  memo: DeletedMemo
  onClose: () => void
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void
}

export function useDeletedMemoActions({ memo, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext }: UseDeletedMemoActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const permanentDeleteNote = usePermanentDeleteNote()
  const restoreNote = useRestoreNote()

  const handlePermanentDelete = async () => {
    try {
      // 次のメモ選択機能があれば使用、なければ通常のクローズ
      if (onDeleteAndSelectNext) {
        onDeleteAndSelectNext(memo)
      } else {
        onClose()
      }

      setShowDeleteModal(false)
      
      // 少し遅延してから削除API実行（UI更新を先に行う）
      setTimeout(async () => {
        await permanentDeleteNote.mutateAsync(memo.id)
      }, 100)
    } catch (error) {
      console.error('完全削除に失敗しました:', error)
      alert('完全削除に失敗しました。')
    }
  }

  const handleRestore = async () => {
    try {
      console.log('復元ボタンクリック:', { memoId: memo.id, hasCallback: !!onRestoreAndSelectNext });
      
      // UIを先に更新
      if (onRestoreAndSelectNext) {
        onRestoreAndSelectNext(memo)
      } else {
        onClose()
      }
      
      // その後APIを実行
      await restoreNote.mutateAsync(memo.id)
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