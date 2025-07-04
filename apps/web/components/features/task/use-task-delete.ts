import { useState } from 'react'
import { useDeleteTask } from '@/src/hooks/use-tasks'
import type { Task } from '@/src/types/task'

interface UseTaskDeleteProps {
  task: Task | null
  onClose: () => void
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void
  onClosePanel?: () => void
  onDeleteAndSelectNext?: (deletedTask: Task) => void
}

export function useTaskDelete({ task, onClose, onSelectTask, onClosePanel, onDeleteAndSelectNext }: UseTaskDeleteProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deleteTask = useDeleteTask()

  const executeDelete = async () => {
    if (!task) return;
    
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

      // 削除API実行
      await deleteTask.mutateAsync(task.id)
    } catch (error) {
      console.error('削除に失敗しました:', error)
      throw error;
    }
  }

  const handleDelete = async () => {
    if (!task) return;
    
    try {
      // モーダルを閉じる
      setShowDeleteModal(false)

      // エディター削除アニメーションを実行
      const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
      const editorArea = document.querySelector('[data-task-editor]') as HTMLElement;
      
      if (!rightTrashButton || !editorArea) {
        // アニメーション要素がない場合は直接削除
        await executeDelete();
        return;
      }
      
      // アニメーション実行後にAPI呼び出し
      const { animateEditorContentToTrash } = await import('@/src/utils/deleteAnimation');
      animateEditorContentToTrash(editorArea, rightTrashButton, async () => {
        await executeDelete();
      });
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