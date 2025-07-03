import { useEffect } from 'react'
import { useDeleteTask, usePermanentDeleteTask } from '@/src/hooks/use-tasks'
import { useBulkDelete } from '@/components/ui/modals'
import type { Task, DeletedTask } from '@/src/types/task'

interface UseTasksBulkDeleteProps {
  activeTab: 'todo' | 'in_progress' | 'completed' | 'deleted'
  checkedTasks: Set<number>
  checkedDeletedTasks: Set<number>
  setCheckedTasks: (tasks: Set<number>) => void
  setCheckedDeletedTasks: (tasks: Set<number>) => void
  tasks?: Task[]
  deletedTasks?: DeletedTask[]
  onTaskDelete?: (id: number) => void
  onDeletedTaskDelete?: (id: number) => void
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
  onDeletedTaskDelete
}: UseTasksBulkDeleteProps) {
  const deleteTaskMutation = useDeleteTask()
  const permanentDeleteTaskMutation = usePermanentDeleteTask()
  const bulkDelete = useBulkDelete()

  // チェック状態のクリーンアップ - 削除されたタスクのチェックを解除
  useEffect(() => {
    if (tasks) {
      const allTaskIds = new Set(tasks.map(t => t.id))
      const newCheckedTasks = new Set(Array.from(checkedTasks).filter(id => allTaskIds.has(id)))
      if (newCheckedTasks.size !== checkedTasks.size) {
        setCheckedTasks(newCheckedTasks)
      }
    }
  }, [tasks, checkedTasks, setCheckedTasks])

  useEffect(() => {
    if (deletedTasks) {
      const deletedTaskIds = new Set(deletedTasks.map(t => t.id))
      const newCheckedDeletedTasks = new Set(Array.from(checkedDeletedTasks).filter(id => deletedTaskIds.has(id)))
      if (newCheckedDeletedTasks.size !== checkedDeletedTasks.size) {
        setCheckedDeletedTasks(newCheckedDeletedTasks)
      }
    }
  }, [deletedTasks, checkedDeletedTasks, setCheckedDeletedTasks])

  const handleBulkDelete = async () => {
    const targetIds = activeTab === "deleted" 
      ? Array.from(checkedDeletedTasks)
      : Array.from(checkedTasks)

    // タスクの場合は1件からモーダル表示（削除済み・通常問わず）
    const threshold = 1

    await bulkDelete.confirmBulkDelete(targetIds, threshold, async (ids) => {
      // 順次削除処理
      for (const id of ids) {
        if (activeTab === "deleted") {
          await permanentDeleteTaskMutation.mutateAsync(id)
          onDeletedTaskDelete?.(id)
        } else {
          await deleteTaskMutation.mutateAsync(id)
          onTaskDelete?.(id)
        }
      }

      // 選択状態をクリア
      if (activeTab === "deleted") {
        setCheckedDeletedTasks(new Set())
      } else {
        setCheckedTasks(new Set())
      }
      // console.log(`${ids.length}件のタスクを削除しました`)
    })
  }

  return {
    handleBulkDelete,
    bulkDeleteState: {
      isModalOpen: bulkDelete.isModalOpen,
      targetIds: bulkDelete.targetIds,
      isDeleting: bulkDelete.isDeleting,
      handleCancel: bulkDelete.handleCancel,
      handleConfirm: async () => {
        await bulkDelete.handleConfirm(async (ids) => {
          // 順次削除処理
          for (const id of ids) {
            if (activeTab === "deleted") {
              await permanentDeleteTaskMutation.mutateAsync(id)
              onDeletedTaskDelete?.(id)
            } else {
              await deleteTaskMutation.mutateAsync(id)
              onTaskDelete?.(id)
            }
          }

          // 選択状態をクリア
          if (activeTab === "deleted") {
            setCheckedDeletedTasks(new Set())
          } else {
            setCheckedTasks(new Set())
          }
        })
      }
    }
  }
}