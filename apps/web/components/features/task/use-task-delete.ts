import { useState } from 'react'
import { useDeleteTask } from '@/src/hooks/use-tasks'
import { useRightEditorDelete } from '@/src/hooks/use-right-editor-delete'
import type { Task } from '@/src/types/task'

interface UseTaskDeleteProps {
  task: Task | null
  onClose: () => void
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void
  onClosePanel?: () => void
  onDeleteAndSelectNext?: (deletedTask: Task, preDeleteDisplayOrder?: number[]) => void
}

export function useTaskDelete({ task, onClose, onSelectTask, onClosePanel, onDeleteAndSelectNext }: UseTaskDeleteProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLidOpen, setIsLidOpen] = useState(false)
  const deleteTask = useDeleteTask()


  // 削除完了時の処理
  const handleDeleteComplete = (deletedTask: Task, preDeleteDisplayOrder?: number[]) => {
    
    // UI更新処理
    if (onDeleteAndSelectNext) {
      onDeleteAndSelectNext(deletedTask, preDeleteDisplayOrder);
    } else {
      if (onSelectTask && onClosePanel) {
        onClosePanel();
        onSelectTask(null, true);
      } else {
        onClose();
      }
    }
    
    // アニメーション完了後に蓋を閉じる
    setTimeout(() => {
      setIsLidOpen(false);
    }, 200);
    
    // 削除完了
    setIsDeleting(false);
  };
  
  // 共通削除処理
  const handleRightEditorDelete = useRightEditorDelete({
    item: task,
    deleteMutation: deleteTask,
    editorSelector: '[data-task-editor]',
    setIsDeleting,
    onDeleteComplete: handleDeleteComplete,
    executeApiFirst: true, // Task方式：先にAPI削除実行
    restoreEditorVisibility: true,
  });

  const handleDelete = async () => {
    if (!task) return;
    
    
    // 重複実行防止
    if (!showDeleteModal || isDeleting) {
      return;
    }
    
    try {
      // モーダルを閉じる
      setShowDeleteModal(false);
      
      // 共通削除処理を実行（DOM順序取得は共通フック内で行う）
      await handleRightEditorDelete(task);
    } catch {
      setIsDeleting(false);
      alert('削除に失敗しました。');
    }
  }

  const showDeleteConfirmation = () => {
    setShowDeleteModal(true)
    // モーダルを表示すると同時に蓋を開く
    setIsLidOpen(true)
  }

  const hideDeleteConfirmation = () => {
    setShowDeleteModal(false)
    // モーダルを閉じる時に蓋も閉じる
    setIsLidOpen(false)
  }

  return {
    // Actions
    handleDelete,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    
    // Modal state
    showDeleteModal,
    
    // Loading state
    isDeleting: isDeleting || deleteTask.isPending,
    
    // Animation state
    isLidOpen
  }
}