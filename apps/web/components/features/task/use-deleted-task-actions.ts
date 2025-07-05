import { useState } from 'react'
import { useRestoreTask } from '@/src/hooks/use-tasks'
import type { DeletedTask } from '@/src/types/task'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { tasksApi } from '@/src/lib/api-client'

interface UseDeletedTaskActionsProps {
  task: DeletedTask
  onClose: () => void
  onDeleteAndSelectNext?: (deletedTask: DeletedTask, preDeleteDisplayOrder?: number[]) => void
  onRestoreAndSelectNext?: (deletedTask: DeletedTask) => void
}

export function useDeletedTaskActions({ task, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext }: UseDeletedTaskActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  
  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteTask = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      const response = await tasksApi.permanentDeleteTask(id, token || undefined)
      return response.json()
    },
    onSuccess: async () => {
      // 完全削除後に削除済みタスクリストを再取得
      await queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] })
      
      // 少し遅延してから次のタスク選択機能を使用（React Queryの状態更新を待つ）
      setTimeout(() => {
        console.log('🔍 削除後の次選択処理開始:', { taskId: task.id });
        if (onDeleteAndSelectNext) {
          onDeleteAndSelectNext(task)
        } else {
          onClose()
        }
      }, 100);
    },
  })
  
  const restoreTask = useRestoreTask()

  const handlePermanentDelete = async () => {
    try {
      setShowDeleteModal(false)
      
      // エディターコンテンツをゴミ箱に吸い込むアニメーション
      const editorArea = document.querySelector('[data-task-editor]') as HTMLElement;
      const rightTrashButton = document.querySelector('[data-right-panel-trash]') as HTMLElement;
      
      if (editorArea && rightTrashButton) {
        const { animateEditorContentToTrash } = await import('@/src/utils/deleteAnimation');
        animateEditorContentToTrash(editorArea, rightTrashButton, async () => {
          // アニメーション完了後の処理
          try {
            // API実行（onSuccessで次選択とキャッシュ更新が実行される）
            await permanentDeleteTask.mutateAsync(task.id)
            
            // 蓋を閉じる
            setTimeout(() => {
              (window as any).closeDeletingLid?.();
            }, 500);
          } catch (error) {
            console.error('完全削除に失敗しました:', error)
            alert('完全削除に失敗しました。')
          }
        });
      } else {
        // アニメーション要素がない場合は通常の処理
        // API実行（onSuccessで次選択とキャッシュ更新が実行される）
        await permanentDeleteTask.mutateAsync(task.id)
        
        setTimeout(() => {
          (window as any).closeDeletingLid?.();
        }, 500);
      }
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
    // キャンセル時も蓋を閉じる
    setTimeout(() => {
      (window as any).closeDeletingLid?.();
    }, 100);
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