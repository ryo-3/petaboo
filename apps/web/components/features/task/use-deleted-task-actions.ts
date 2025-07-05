import { useState } from 'react'
import { usePermanentDeleteTask, useRestoreTask } from '@/src/hooks/use-tasks'
import type { DeletedTask } from '@/src/types/task'

interface UseDeletedTaskActionsProps {
  task: DeletedTask
  onClose: () => void
  onDeleteAndSelectNext?: (deletedTask: DeletedTask, preDeleteDisplayOrder?: number[]) => void
  onRestoreAndSelectNext?: (deletedTask: DeletedTask) => void
}

export function useDeletedTaskActions({ task, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext }: UseDeletedTaskActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const permanentDeleteTask = usePermanentDeleteTask()
  const restoreTask = useRestoreTask()

  const handlePermanentDelete = async () => {
    console.log('🎯 削除済みタスク削除開始:', { taskId: task.id, showDeleteModal, isDeleting });
    
    // 重複実行防止
    if (!showDeleteModal || isDeleting) {
      console.log('🎯 モーダルが既に閉じられているか削除中のため処理をスキップ');
      return;
    }
    
    try {
      // 削除中状態を設定
      setIsDeleting(true);
      
      // モーダルを閉じる
      console.log('🎯 モーダルを閉じる');
      setShowDeleteModal(false);

      // 削除前のDOM順序を保存
      const { getTaskDisplayOrder } = await import('@/src/utils/domUtils');
      const preDeleteDisplayOrder = getTaskDisplayOrder();
      console.log('🎯 削除前のDOM順序:', { preDeleteDisplayOrder, deletedTaskId: task.id });

      // エディター削除アニメーションを実行
      const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
      const editorArea = document.querySelector('[data-task-editor]') as HTMLElement;
      
      console.log('🎯 削除済みタスク削除要素チェック:', { 
        rightTrashButton, 
        editorArea,
        rightTrashFound: !!rightTrashButton,
        editorAreaFound: !!editorArea
      });
      
      if (!rightTrashButton || !editorArea) {
        console.log('🎯 アニメーション要素が見つからない、直接削除実行');
        // アニメーション要素がない場合は直接削除
        await executeDelete();
        return;
      }
      
      console.log('🎯 削除済みタスク削除アニメーション開始');
      
      // 先にAPI削除だけ実行（UI更新は後）
      console.log('🎯 API削除のみ先行実行');
      await permanentDeleteTask.mutateAsync(task.id);
      console.log('🎯 API削除完了、アニメーション後にUI更新予定');
      
      const { animateEditorContentToTrash } = await import('@/src/utils/deleteAnimation');
      animateEditorContentToTrash(editorArea, rightTrashButton, async () => {
        console.log('🎯 アニメーション完了、UI更新実行');
        
        // エディター要素のvisibilityを復元
        editorArea.style.visibility = 'visible';
        editorArea.style.pointerEvents = 'auto';
        console.log('🎯 エディター表示復元');
        
        // アニメーション完了後にUI更新のみ実行
        if (onDeleteAndSelectNext) {
          console.log('🎯 onDeleteAndSelectNext実行');
          // 削除前のDOM順序を使用して次のタスクを選択
          onDeleteAndSelectNext(task, preDeleteDisplayOrder)
        } else {
          console.log('🎯 通常のクローズ処理');
          onClose()
        }
        
        // 削除完了
        setIsDeleting(false);
      });
      
    } catch (error) {
      console.error('完全削除に失敗しました:', error)
      setIsDeleting(false);
      alert('完全削除に失敗しました。')
    }
  }
  
  const executeDelete = async () => {
    try {
      console.log('🎯 executeDelete開始（削除済みタスク）:', { task: task.id });
      
      // 次のタスク選択機能があれば使用、なければ通常のクローズ
      if (onDeleteAndSelectNext) {
        console.log('🎯 onDeleteAndSelectNext実行');
        onDeleteAndSelectNext(task)
      } else {
        console.log('🎯 onClose実行');
        onClose()
      }

      console.log('🎯 削除API実行開始');
      // 削除API実行
      await permanentDeleteTask.mutateAsync(task.id)
      console.log('🎯 削除API完了');
    } catch (error) {
      console.error('削除に失敗しました:', error)
      throw error;
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
    isDeleting: isDeleting || permanentDeleteTask.isPending,
    isRestoring: restoreTask.isPending
  }
}