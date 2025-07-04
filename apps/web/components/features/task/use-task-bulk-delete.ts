import { useEffect } from 'react'
import { useDeleteTask, usePermanentDeleteTask } from '@/src/hooks/use-tasks'
import { useBulkDelete } from '@/components/ui/modals'
import { animateMultipleItemsToTrash, animateMultipleItemsToTrashWithRect } from '@/src/utils/deleteAnimation'
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
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>
  setIsDeleting?: (isDeleting: boolean) => void
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
  onDeletedTaskDelete,
  deleteButtonRef,
  setIsDeleting
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

    // 削除ボタンの位置を事前に保存
    const buttonRect = deleteButtonRef?.current?.getBoundingClientRect();
    
    // 削除ボタンを押した瞬間に蓋を開く
    if (activeTab !== "deleted") {
      setIsDeleting?.(true)
    }
    
    await bulkDelete.confirmBulkDelete(targetIds, threshold, async (ids) => {
      // ゴミ箱アニメーション実行（通常削除のみ）
      if (activeTab !== "deleted" && buttonRect) {
        // 保存された位置情報を使用
        animateMultipleItemsToTrashWithRect(ids, buttonRect, () => {
          // アニメーション完了後にState更新
          for (const id of ids) {
            onTaskDelete?.(id)
          }
          // アニメーション完了後、1秒待ってから選択状態をクリア
          setTimeout(() => {
            setCheckedTasks(new Set())
            // アニメーション終了
            setIsDeleting?.(false)
          }, 1000)
        })
      } else {
        // 削除済みアイテムの完全削除は即座にState更新
        for (const id of ids) {
          if (activeTab === "deleted") {
            onDeletedTaskDelete?.(id)
          } else {
            onTaskDelete?.(id)
          }
        }
        // 選択状態をクリア (UI即座更新)
        if (activeTab === "deleted") {
          setCheckedDeletedTasks(new Set())
        } else {
          setCheckedTasks(new Set())
        }
      }

      // API処理を遅延実行
      setTimeout(async () => {
        for (const id of ids) {
          try {
            if (activeTab === "deleted") {
              await permanentDeleteTaskMutation.mutateAsync(id)
            } else {
              await deleteTaskMutation.mutateAsync(id)
            }
          } catch (error) {
            console.error(`タスク削除エラー (ID: ${id}):`, error)
          }
        }
      }, activeTab !== "deleted" ? 700 : 100) // アニメーション時間を考慮
      
      // console.log(`${ids.length}件のタスクを削除しました`)
    })
  }

  return {
    handleBulkDelete,
    bulkDeleteState: {
      isModalOpen: bulkDelete.isModalOpen,
      targetIds: bulkDelete.targetIds,
      isDeleting: bulkDelete.isDeleting,
      handleCancel: () => {
        // キャンセル時に蓋を閉じる
        setIsDeleting?.(false)
        bulkDelete.handleCancel()
      },
      handleConfirm: async () => {
        await bulkDelete.handleConfirm(async (ids) => {
          // 選択状態をクリア (UI即座更新)
          if (activeTab === "deleted") {
            setCheckedDeletedTasks(new Set())
          } else {
            setCheckedTasks(new Set())
          }
          
          // State側からも削除 (UI即座更新)
          for (const id of ids) {
            if (activeTab === "deleted") {
              onDeletedTaskDelete?.(id)
            } else {
              onTaskDelete?.(id)
            }
          }

          // API処理を遅延実行
          setTimeout(async () => {
            for (const id of ids) {
              try {
                if (activeTab === "deleted") {
                  await permanentDeleteTaskMutation.mutateAsync(id)
                } else {
                  await deleteTaskMutation.mutateAsync(id)
                }
              } catch (error) {
                console.error(`タスク削除エラー (ID: ${id}):`, error)
              }
            }
          }, 100)
        })
      }
    }
  }
}