import { useEffect } from 'react'
import { useRestoreTask } from '@/src/hooks/use-tasks'
import { useBulkDelete, BulkRestoreConfirmation } from '@/components/ui/modals'
import type { DeletedTask } from '@/src/types/task'
import React from 'react'

interface UseTasksBulkRestoreProps {
  checkedDeletedTasks: Set<number>
  setCheckedDeletedTasks: (tasks: Set<number>) => void
  deletedTasks?: DeletedTask[]
  onDeletedTaskRestore?: (id: number) => void
}

export function useTasksBulkRestore({
  checkedDeletedTasks,
  setCheckedDeletedTasks,
  deletedTasks,
  onDeletedTaskRestore
}: UseTasksBulkRestoreProps) {
  const restoreTaskMutation = useRestoreTask()
  const bulkRestore = useBulkDelete() // 削除と同じモーダルロジックを使用

  // チェック状態のクリーンアップ - 復元されたタスクのチェックを解除
  useEffect(() => {
    if (deletedTasks) {
      const deletedTaskIds = new Set(deletedTasks.map(t => t.id))
      const newCheckedDeletedTasks = new Set(Array.from(checkedDeletedTasks).filter(id => deletedTaskIds.has(id)))
      if (newCheckedDeletedTasks.size !== checkedDeletedTasks.size) {
        setCheckedDeletedTasks(newCheckedDeletedTasks)
      }
    }
  }, [deletedTasks, checkedDeletedTasks, setCheckedDeletedTasks])

  // 共通の復元処理関数
  const executeRestoreWithAnimation = async (ids: number[]) => {
    console.log('✅ 復元処理開始:', { ids: ids.length })
    
    // 復元前にDOM順序を取得（復元後は要素が消えるため）
    const { getTaskDisplayOrder } = await import('@/src/utils/domUtils')
    const preRestoreDisplayOrder = getTaskDisplayOrder()
    console.log('📋 復元前のDOM順序取得:', { order: preRestoreDisplayOrder, count: preRestoreDisplayOrder.length })
    
    // 30件以上は最初の30個だけアニメーション、残りは一括復元
    if (ids.length > 30) {
      console.log('🎬➡️⚡ 混合復元モード:', { count: ids.length })
      
      // 最初の30個をアニメーション
      const animatedIds = ids.slice(0, 30)
      const bulkIds = ids.slice(30)
      
      console.log('🎬 最初の30個のアニメーション:', { animated: animatedIds.length, bulk: bulkIds.length })
      
      const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation')
      
      // DOM順序でソートされたIDを渡す
      const sortedAnimatedIds = preRestoreDisplayOrder.filter(id => animatedIds.includes(id))
      
      animateBulkFadeOutCSS(sortedAnimatedIds, async () => {
        console.log('🎬 最初のアニメーション完了、一括復元開始:', { bulk: bulkIds.length })
        
        // 残りを一括でState更新
        for (const id of bulkIds) {
          onDeletedTaskRestore?.(id)
        }
        
        // 選択状態をクリア（削除側と同じ分割処理）
        const newCheckedDeletedTasks = new Set(checkedDeletedTasks)
        ids.forEach(id => newCheckedDeletedTasks.delete(id))
        setCheckedDeletedTasks(newCheckedDeletedTasks)
        
        // アニメーション分の一括State更新 + API実行
        for (const id of animatedIds) {
          onDeletedTaskRestore?.(id)
          try {
            await restoreTaskMutation.mutateAsync(id)
          } catch (error) {
            console.error(`アニメーション復元エラー (ID: ${id}):`, error)
          }
        }
        
        // 残りを一括でState更新 + API実行
        for (const id of bulkIds) {
          onDeletedTaskRestore?.(id)
          try {
            await restoreTaskMutation.mutateAsync(id)
          } catch (error) {
            console.error(`一括復元エラー (ID: ${id}):`, error)
          }
        }
        
        console.log('⚡ 混合復元完了:', { animated: animatedIds.length, bulk: bulkIds.length })
      }, 120, 'restore')
      
      return
    }
    
    // 30件以下はアニメーション付き復元
    console.log('🎬 アニメーション復元:', { count: ids.length })
    const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation')
    
    // DOM順序でソートされたIDを渡す
    const sortedIds = preRestoreDisplayOrder.filter(id => ids.includes(id))
    
    animateBulkFadeOutCSS(sortedIds, async () => {
      console.log('🌟 全アニメーション完了:', { ids: ids.length })
      
      // 一括State更新 + API実行
      for (const id of ids) {
        onDeletedTaskRestore?.(id)
        try {
          await restoreTaskMutation.mutateAsync(id)
        } catch (error) {
          console.error(`復元エラー (ID: ${id}):`, error)
        }
      }
      
      // 選択状態をクリア
      setCheckedDeletedTasks(new Set())
    }, 120, 'restore')
  }

  const handleBulkRestore = async () => {
    const targetIds = Array.from(checkedDeletedTasks)

    // タスクの場合は1件からモーダル表示
    const threshold = 1

    console.log('🔄 復元開始:', { targetIds: targetIds.length })
    
    await bulkRestore.confirmBulkDelete(targetIds, threshold, executeRestoreWithAnimation)
  }

  const RestoreModal = () => (
    <BulkRestoreConfirmation
      isOpen={bulkRestore.isModalOpen}
      onClose={bulkRestore.handleCancel}
      onConfirm={async () => {
        console.log('Confirm restore modal')
        await bulkRestore.handleConfirm()
      }}
      count={bulkRestore.targetIds.length}
      itemType="task"
      isLoading={bulkRestore.isDeleting}
    />
  )

  return {
    handleBulkRestore,
    RestoreModal,
  }
}