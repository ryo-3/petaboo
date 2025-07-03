import { useState } from 'react'
import { useDeleteTask } from '@/src/hooks/use-tasks'
import type { Task } from '@/src/types/task'

interface UseTaskDeleteProps {
  task: Task
  onClose: () => void
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void
  onClosePanel?: () => void
  onDeleteAndSelectNext?: (deletedTask: Task) => void
}

export function useTaskDelete({ task, onClose, onSelectTask, onClosePanel, onDeleteAndSelectNext }: UseTaskDeleteProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deleteTask = useDeleteTask()

  const handleDelete = async () => {
    try {
      // 次のタスク選択機能があれば使用、なければ通常のクローズ
      if (onDeleteAndSelectNext) {
        onDeleteAndSelectNext(task)
      } else {
        // 従来の動作：エディターを閉じる
        if (onSelectTask && onClosePanel) {
          onClosePanel()
          onSelectTask(null, true)
        } else {
          onClose()
        }
      }

      // モーダルを閉じる
      setShowDeleteModal(false)

      // すぐに削除API実行
      await deleteTask.mutateAsync(task.id)
    } catch (error) {
      console.error('削除に失敗しました:', error)
      alert('削除に失敗しました。')
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
    handleDelete,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    
    // Modal state
    showDeleteModal,
    
    // Loading state
    isDeleting: deleteTask.isPending
  }
}