import { useEffect } from 'react'
import { useRestoreTask } from '@/src/hooks/use-tasks'
import { useBulkDelete } from '@/components/ui/modals'
import type { DeletedTask } from '@/src/types/task'

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
  const bulkRestore = useBulkDelete() // 同じモーダルロジックを使用

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

  const handleBulkRestore = async () => {
    const targetIds = Array.from(checkedDeletedTasks)

    // タスクの場合は1件からモーダル表示
    const threshold = 1

    await bulkRestore.confirmBulkDelete(targetIds, threshold, async (ids) => {
      // 選択状態をクリア (UI即座更新)
      setCheckedDeletedTasks(new Set())
      
      // State側からも削除 (UI即座更新)
      for (const id of ids) {
        onDeletedTaskRestore?.(id)
      }

      // API処理を遅延実行
      setTimeout(async () => {
        for (const id of ids) {
          try {
            await restoreTaskMutation.mutateAsync(id)
          } catch (error) {
            console.error(`タスク復元エラー (ID: ${id}):`, error)
          }
        }
      }, 100)
    })
  }

  return {
    handleBulkRestore,
    bulkRestoreState: {
      isModalOpen: bulkRestore.isModalOpen,
      targetIds: bulkRestore.targetIds,
      isRestoring: bulkRestore.isDeleting, // 同じ状態を使用
      handleCancel: bulkRestore.handleCancel,
      handleConfirm: async () => {
        await bulkRestore.handleConfirm(async (ids) => {
          // 選択状態をクリア (UI即座更新)
          setCheckedDeletedTasks(new Set())
          
          // State側からも削除 (UI即座更新)
          for (const id of ids) {
            onDeletedTaskRestore?.(id)
          }

          // API処理を遅延実行
          setTimeout(async () => {
            for (const id of ids) {
              try {
                await restoreTaskMutation.mutateAsync(id)
              } catch (error) {
                console.error(`タスク復元エラー (ID: ${id}):`, error)
              }
            }
          }, 100)
        })
      }
    }
  }
}