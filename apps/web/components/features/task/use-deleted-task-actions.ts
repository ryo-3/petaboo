import { useState } from 'react'
import { usePermanentDeleteTask, useRestoreTask } from '@/src/hooks/use-tasks'
import type { DeletedTask } from '@/src/types/task'

interface UseDeletedTaskActionsProps {
  task: DeletedTask
  onClose: () => void
  onDeleteAndSelectNext?: (deletedTask: DeletedTask) => void
  onRestoreAndSelectNext?: (deletedTask: DeletedTask) => void
}

export function useDeletedTaskActions({ task, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext }: UseDeletedTaskActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const permanentDeleteTask = usePermanentDeleteTask()
  const restoreTask = useRestoreTask()

  const handlePermanentDelete = async () => {
    try {
      // 次のタスク選択機能があれば使用、なければ通常のクローズ
      if (onDeleteAndSelectNext) {
        onDeleteAndSelectNext(task)
      } else {
        onClose()
      }

      setShowDeleteModal(false)
      
      // すぐに削除API実行
      await permanentDeleteTask.mutateAsync(task.id)
    } catch (error) {
      console.error('完全削除に失敗しました:', error)
      alert('完全削除に失敗しました。')
    }
  }

  const handleRestore = async () => {
    try {
      // console.log('復元ボタンクリック:', { taskId: task.id, hasCallback: !!onRestoreAndSelectNext });
      
      // UIを先に更新
      if (onRestoreAndSelectNext) {
        onRestoreAndSelectNext(task)
      } else {
        onClose()
      }
      
      // その後APIを実行
      await restoreTask.mutateAsync(task.id)
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
    isDeleting: permanentDeleteTask.isPending,
    isRestoring: restoreTask.isPending
  }
}