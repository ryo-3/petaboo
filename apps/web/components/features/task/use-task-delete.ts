import { useState } from 'react'
import { useDeleteTask } from '@/src/hooks/use-tasks'
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

  const executeDelete = async () => {
    if (!task) return;
    
    try {
      console.log('🎯 executeDelete開始:', { 
        task: task.id, 
        hasOnDeleteAndSelectNext: !!onDeleteAndSelectNext,
        hasOnSelectTask: !!onSelectTask,
        hasOnClosePanel: !!onClosePanel
      });
      
      // 次のタスク選択機能があれば使用、なければ通常のクローズ
      if (onDeleteAndSelectNext) {
        console.log('🎯 onDeleteAndSelectNext実行');
        onDeleteAndSelectNext(task)
      } else {
        console.log('🎯 通常のクローズ処理');
        // 従来の動作：エディターを閉じる
        if (onSelectTask && onClosePanel) {
          console.log('🎯 onClosePanel & onSelectTask実行');
          onClosePanel()
          onSelectTask(null, true)
        } else {
          console.log('🎯 onClose実行');
          onClose()
        }
      }

      console.log('🎯 削除API実行開始');
      // 削除API実行
      await deleteTask.mutateAsync(task.id)
      console.log('🎯 削除API完了');
    } catch (error) {
      console.error('削除に失敗しました:', error)
      throw error;
    }
  }

  const handleDelete = async () => {
    if (!task) return;
    
    console.log('🎯 handleDelete呼び出し開始', { taskId: task.id, showDeleteModal, isDeleting });
    
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
      setShowDeleteModal(false)

      // 削除前のDOM順序を保存
      const { getTaskDisplayOrder } = await import('@/src/utils/domUtils');
      const preDeleteDisplayOrder = getTaskDisplayOrder();
      console.log('🎯 削除前のDOM順序:', { preDeleteDisplayOrder, deletedTaskId: task.id });

      // エディター削除アニメーションを実行
      const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
      const editorArea = document.querySelector('[data-task-editor]') as HTMLElement;
      
      console.log('🎯 個別削除要素チェック:', { 
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
      
      console.log('🎯 個別削除アニメーション開始');
      
      // アニメーション実行時にUI更新とAPI呼び出しを分離
      const { animateEditorContentToTrash } = await import('@/src/utils/deleteAnimation');
      
      // 先にAPI削除だけ実行（UI更新は後）
      console.log('🎯 API削除のみ先行実行');
      await deleteTask.mutateAsync(task.id);
      console.log('🎯 API削除完了、アニメーション後にUI更新予定');
      
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
          if (onSelectTask && onClosePanel) {
            console.log('🎯 onClosePanel & onSelectTask実行');
            onClosePanel()
            onSelectTask(null, true)
          } else {
            console.log('🎯 onClose実行');
            onClose()
          }
        }
        
        // アニメーション完了後に蓋を閉じる
        setTimeout(() => {
          setIsLidOpen(false);
        }, 200);
        
        // 削除完了
        setIsDeleting(false);
      });
    } catch (error) {
      console.error('削除に失敗しました:', error)
      setIsDeleting(false);
      alert('削除に失敗しました。')
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