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
    console.log('🎯 handleDeleteComplete開始:', { deletedTaskId: deletedTask.id });
    
    // UI更新処理
    if (onDeleteAndSelectNext) {
      console.log('🎯 onDeleteAndSelectNext実行');
      onDeleteAndSelectNext(deletedTask, preDeleteDisplayOrder);
    } else {
      console.log('🎯 通常のクローズ処理');
      if (onSelectTask && onClosePanel) {
        console.log('🎯 onClosePanel & onSelectTask実行');
        onClosePanel();
        onSelectTask(null, true);
      } else {
        console.log('🎯 onClose実行');
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
    
    console.log('🎯 handleDelete呼び出し開始', { taskId: task.id, showDeleteModal, isDeleting });
    
    // 重複実行防止
    if (!showDeleteModal || isDeleting) {
      console.log('🎯 モーダルが既に閉じられているか削除中のため処理をスキップ');
      return;
    }
    
    try {
      // モーダルを閉じる
      console.log('🎯 モーダルを閉じる');
      setShowDeleteModal(false);
      
      // 共通削除処理を実行（DOM順序取得は共通フック内で行う）
      await handleRightEditorDelete(task);
    } catch (error) {
      console.error('削除に失敗しました:', error);
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