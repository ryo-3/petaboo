import { useEffect } from 'react'
import { useDeleteTask, usePermanentDeleteTask } from '@/src/hooks/use-tasks'
import { useBulkDelete, BulkDeleteConfirmation } from '@/components/ui/modals'
import type { Task, DeletedTask } from '@/src/types/task'
import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { tasksApi } from '@/src/lib/api-client'
import { useBulkAnimation } from '@/src/hooks/use-bulk-animation'
import { executeWithAnimation } from '@/src/utils/bulkAnimationUtils'
import { DeletionWarningMessage } from '@/components/ui/modals/deletion-warning-message'

interface UseTasksBulkDeleteProps {
  activeTab: 'todo' | 'in_progress' | 'completed' | 'deleted'
  checkedTasks: Set<number>
  checkedDeletedTasks: Set<number>
  setCheckedTasks: (tasks: Set<number>) => void
  setCheckedDeletedTasks: (tasks: Set<number>) => void
  tasks?: Task[]
  deletedTasks?: DeletedTask[]
  onTaskDelete?: (id: number) => void
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>
  setIsDeleting?: (isDeleting: boolean) => void
  setIsLidOpen?: (isOpen: boolean) => void
  viewMode?: 'list' | 'card'
}

export function useTasksBulkDelete({
  activeTab,
  checkedTasks,
  checkedDeletedTasks,
  setCheckedTasks,
  setCheckedDeletedTasks,
  tasks,
  deletedTasks,
  onTaskDelete,
  deleteButtonRef,
  setIsDeleting,
  setIsLidOpen,
  viewMode = 'list' // eslint-disable-line @typescript-eslint/no-unused-vars
}: UseTasksBulkDeleteProps) {
  const deleteTaskMutation = useDeleteTask()
  const permanentDeleteTaskMutation = usePermanentDeleteTask()
  const bulkDelete = useBulkDelete()
  const { getToken } = useAuth()
  
  // 自動更新なしの削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteTaskWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      const response = await tasksApi.deleteTask(id, token || undefined)
      return response.json()
    },
    // onSuccessなし（自動更新しない）
  })
  
  // 自動更新なしの完全削除API - 今後の最適化で使用予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const permanentDeleteTaskWithoutUpdate = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      const response = await tasksApi.permanentDeleteTask(id, token || undefined)
      return response.json()
    },
    // onSuccessなし（自動更新しない）
  })
  
  // 共通のアニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
  })

  // チェック状態のクリーンアップ - 削除されたタスクのチェックを解除（部分削除中は無効）
  useEffect(() => {
    if (tasks && !bulkAnimation.isPartialProcessing) {
      const allTaskIds = new Set(tasks.map(t => t.id))
      const newCheckedTasks = new Set(Array.from(checkedTasks).filter(id => allTaskIds.has(id)))
      if (newCheckedTasks.size !== checkedTasks.size) {
        setCheckedTasks(newCheckedTasks)
      }
    }
  }, [tasks, checkedTasks, setCheckedTasks, bulkAnimation.isPartialProcessing])

  // 削除中フラグを外部で管理
  const isCurrentlyDeleting = deleteTaskMutation.isPending || permanentDeleteTaskMutation.isPending
  
  useEffect(() => {
    // 削除中は自動クリーンアップを無効にする（部分削除中も無効）
    if (deletedTasks && !isCurrentlyDeleting && !bulkAnimation.isPartialProcessing) {
      const deletedTaskIds = new Set(deletedTasks.map(t => t.id))
      const newCheckedDeletedTasks = new Set(Array.from(checkedDeletedTasks).filter(id => deletedTaskIds.has(id)))
      if (newCheckedDeletedTasks.size !== checkedDeletedTasks.size) {
        setCheckedDeletedTasks(newCheckedDeletedTasks)
      }
    }
  }, [deletedTasks, checkedDeletedTasks, setCheckedDeletedTasks, isCurrentlyDeleting, bulkAnimation.isPartialProcessing])

  // 共通の削除処理関数（共通ロジック使用）
  const executeDeleteWithAnimation = async (
    ids: number[],
    isPartialDelete = false,
    originalTotalCount?: number
  ) => {
    const onStateUpdate = (id: number) => {
      if (activeTab !== "deleted" && onTaskDelete) {
        onTaskDelete(id)
      }
    }

    const onCheckStateUpdate = (ids: number[], isPartial: boolean) => {
      if (isPartial) {
        if (activeTab === "deleted") {
          const newCheckedDeletedTasks = new Set(checkedDeletedTasks)
          ids.forEach((id) => newCheckedDeletedTasks.delete(id))
          setCheckedDeletedTasks(newCheckedDeletedTasks)
        } else {
          const newCheckedTasks = new Set(checkedTasks)
          ids.forEach((id) => newCheckedTasks.delete(id))
          setCheckedTasks(newCheckedTasks)
        }
      } else {
        if (activeTab === "deleted") {
          setCheckedDeletedTasks(new Set())
        } else {
          setCheckedTasks(new Set())
        }
      }
    }

    const onApiCall = async (id: number) => {
      if (activeTab === "deleted") {
        await permanentDeleteTaskMutation.mutateAsync(id)
      } else {
        await deleteTaskMutation.mutateAsync(id)
      }
    }

    await executeWithAnimation({
      ids,
      isPartial: isPartialDelete,
      originalTotalCount,
      buttonRef: deleteButtonRef,
      dataAttribute: "data-task-id",
      onStateUpdate,
      onCheckStateUpdate,
      onApiCall,
      initializeAnimation: bulkAnimation.initializeAnimation,
      startCountdown: bulkAnimation.startCountdown,
      finalizeAnimation: bulkAnimation.finalizeAnimation,
      setIsProcessing: setIsDeleting,
      setIsLidOpen,
    })
  }

  // ステータス別カウントを取得する関数
  const getStatusBreakdown = (taskIds: number[]) => {
    if (activeTab === "deleted") {
      return [{ status: 'deleted', label: '削除済み', count: taskIds.length, color: 'bg-red-600' }];
    }
    
    const allTasks = tasks || [];
    const selectedTasks = allTasks.filter(task => taskIds.includes(task.id));
    
    const todoCount = selectedTasks.filter(task => task.status === 'todo').length;
    const inProgressCount = selectedTasks.filter(task => task.status === 'in_progress').length;
    const completedCount = selectedTasks.filter(task => task.status === 'completed').length;
    
    const breakdown = [];
    if (todoCount > 0) breakdown.push({ status: 'todo', label: '未着手', count: todoCount, color: 'bg-zinc-400' });
    if (inProgressCount > 0) breakdown.push({ status: 'in_progress', label: '進行中', count: inProgressCount, color: 'bg-Blue' });
    if (completedCount > 0) breakdown.push({ status: 'completed', label: '完了', count: completedCount, color: 'bg-Green' });
    
    return breakdown;
  };

  // カスタムメッセージコンポーネント
  const TaskDeleteMessage = ({ taskIds, currentTabTaskIds }: { taskIds: number[]; currentTabTaskIds: number[] }) => {
    const allStatusBreakdown = getStatusBreakdown(taskIds);
    const currentTabStatusBreakdown = getStatusBreakdown(currentTabTaskIds);
    const isLimited = currentTabTaskIds.length > 100;
    
    // 他のタブにも選択アイテムがあるかチェック（削除済みタブの場合は通常タブをチェック）
    const hasOtherTabItems = activeTab === "deleted" 
      ? checkedTasks.size > 0 
      : taskIds.length > currentTabTaskIds.length;
    
    return (
      <DeletionWarningMessage
        hasOtherTabItems={hasOtherTabItems}
        isLimited={isLimited}
        statusBreakdown={hasOtherTabItems ? currentTabStatusBreakdown : allStatusBreakdown}
        showStatusBreakdown={true}
      />
    );
  };

  const handleBulkDelete = async () => {
    const rawTargetIds = activeTab === "deleted" 
      ? Array.from(checkedDeletedTasks)
      : Array.from(checkedTasks)

    // 現在のタブに表示されているタスクのIDのみを抽出
    const { getTaskDisplayOrder } = await import('@/src/utils/domUtils');
    const domOrder = getTaskDisplayOrder();
    const currentTabTaskIds = rawTargetIds.filter(id => domOrder.includes(id));
    
    // DOM順序でソート
    const targetIds = currentTabTaskIds.sort((a, b) => {
      const aIndex = domOrder.indexOf(a);
      const bIndex = domOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // タスクの場合は1件からモーダル表示（削除済み・通常問わず）
    const threshold = 1
    
    // 100件超えの場合は最初の100件のみ処理（DOM順序での最初の100件）
    const actualTargetIds = targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds
    const isLimitedDelete = targetIds.length > 100

    // 削除ボタンを押した瞬間の状態設定（カウンター維持）
    bulkAnimation.setModalState(setIsDeleting, setIsLidOpen)

    // console.log('🗑️ 削除開始:', { 
    //   selected: targetIds.length, 
    //   actualDelete: actualTargetIds.length, 
    //   activeTab,
    //   isLimited: isLimitedDelete 
    // })
    
    if (isLimitedDelete) {
      // 100件制限のモーダル表示
      await bulkDelete.confirmBulkDelete(
        actualTargetIds, 
        0, // 即座にモーダル表示
        async (ids: number[], isPartialDelete = false) => {
          await executeDeleteWithAnimation(ids, isPartialDelete, targetIds.length);
        },
        <TaskDeleteMessage taskIds={rawTargetIds} currentTabTaskIds={targetIds} />,
        true // isPartialDelete
      )
    } else {
      // 通常の確認モーダル
      await bulkDelete.confirmBulkDelete(
        actualTargetIds, 
        threshold, 
        async (ids: number[]) => {
          await executeDeleteWithAnimation(ids);
        },
        <TaskDeleteMessage taskIds={rawTargetIds} currentTabTaskIds={targetIds} />
      )
    }
  }

  const DeleteModal = () => {
    const customTitle = activeTab === "deleted" 
      ? "タスクの完全削除" 
      : "タスクを削除";
    
    
    return (
      <BulkDeleteConfirmation
        isOpen={bulkDelete.isModalOpen}
        onClose={() => {
          bulkAnimation.handleModalCancel(setIsDeleting, setIsLidOpen)
          bulkDelete.handleCancel()
        }}
        onConfirm={async () => {
          // console.log('Confirm modal')
          await bulkDelete.handleConfirm()
        }}
        count={bulkDelete.targetIds.length}
        itemType="task"
        deleteType={activeTab === "deleted" ? "permanent" : "normal"}
        isLoading={bulkDelete.isDeleting}
        customMessage={bulkDelete.customMessage}
        customTitle={customTitle}
      />
    );
  };

  // 現在のタブで削除対象となるタスクの数を計算
  const getCurrentTabDeleteCount = () => {
    if (activeTab === "deleted") {
      return checkedDeletedTasks.size;
    }
    
    // 通常タブの場合、現在表示されているタスクのうち選択されているもののみカウント
    const allTasks = tasks || [];
    const currentTabTasks = allTasks.filter(task => task.status === activeTab);
    const currentTabTaskIds = currentTabTasks.map(task => task.id);
    const selectedCurrentTabTasks = Array.from(checkedTasks).filter(id => currentTabTaskIds.includes(id));
    
    return selectedCurrentTabTasks.length;
  };

  // 現在の削除カウント（通常時は現在のタブの件数、削除中はアニメーション用）
  const currentDeleteCount = getCurrentTabDeleteCount();
  const finalDisplayCount = bulkAnimation.isCountingActive
    ? bulkAnimation.displayCount
    : currentDeleteCount

  // デバッグログ
  // console.log('🔄 削除カウンター状態:', {
  //   activeTab,
  //   isCountingActive: bulkAnimation.isCountingActive,
  //   displayCount: bulkAnimation.displayCount,
  //   currentDeleteCount,
  //   finalDisplayCount,
  //   checkedTasksSize: checkedTasks.size,
  //   checkedDeletedTasksSize: checkedDeletedTasks.size
  // })

  return {
    handleBulkDelete,
    DeleteModal,
    // カウンターアクティブ時はdisplayCount、それ以外は実際のカウント
    currentDisplayCount: finalDisplayCount,
  }
}