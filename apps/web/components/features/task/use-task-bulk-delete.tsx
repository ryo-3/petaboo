import { useEffect, useRef } from 'react'
import { useDeleteTask, usePermanentDeleteTask } from '@/src/hooks/use-tasks'
import { useBulkDelete, BulkDeleteConfirmation } from '@/components/ui/modals'
import type { Task, DeletedTask } from '@/src/types/task'
import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { tasksApi } from '@/src/lib/api-client'

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
  
  // タイマーIDを保持
  const timerRef = useRef<{ isDeleting?: NodeJS.Timeout; clearChecked?: NodeJS.Timeout }>({})

  // チェック状態が変更されたらタイマーをクリア
  useEffect(() => {
    if (checkedTasks.size > 0) {
      // 新しい選択があったらタイマーをクリア
      if (timerRef.current.clearChecked) {
        clearTimeout(timerRef.current.clearChecked)
        timerRef.current.clearChecked = undefined
      }
      if (timerRef.current.isDeleting) {
        clearTimeout(timerRef.current.isDeleting)
        timerRef.current.isDeleting = undefined
      }
    }
  }, [checkedTasks])

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

  // 削除中フラグを外部で管理
  const isCurrentlyDeleting = deleteTaskMutation.isPending || permanentDeleteTaskMutation.isPending
  
  useEffect(() => {
    // 削除中は自動クリーンアップを無効にする
    if (deletedTasks && !isCurrentlyDeleting) {
      const deletedTaskIds = new Set(deletedTasks.map(t => t.id))
      const newCheckedDeletedTasks = new Set(Array.from(checkedDeletedTasks).filter(id => deletedTaskIds.has(id)))
      if (newCheckedDeletedTasks.size !== checkedDeletedTasks.size) {
        setCheckedDeletedTasks(newCheckedDeletedTasks)
      }
    }
  }, [deletedTasks, checkedDeletedTasks, setCheckedDeletedTasks, isCurrentlyDeleting])

  // 共通の削除処理関数
  const executeDeleteWithAnimation = async (ids: number[], isPartialDelete = false) => {
    // 削除ボタンの位置を取得
    const buttonRect = deleteButtonRef?.current?.getBoundingClientRect()
    
    console.log('✅ 削除処理開始:', { ids: ids.length, activeTab, hasButtonRect: !!buttonRect })
    
    // アニメーションが必要な場合（通常タスクまたは削除済みタスク）
    if (buttonRect) {
      console.log('🎬 処理開始:', { ids: ids.length })
      
      // 蓋を開く
      setIsLidOpen?.(true)
      
      // 30件以上は最初の30個だけアニメーション、残りは一括削除
      if (ids.length > 30) {
        console.log('🎬➡️⚡ 混合削除モード:', { count: ids.length })
        
        // 最初の30個をアニメーション
        const animatedIds = ids.slice(0, 30)
        const bulkIds = ids.slice(30)
        
        console.log('🎬 最初の30個のアニメーション:', { animated: animatedIds.length, bulk: bulkIds.length })
        const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation')
        
        animateBulkFadeOutCSS(animatedIds, async () => {
          console.log('🎬 最初のアニメーション完了、一括削除開始:', { bulk: bulkIds.length })
          
          // 残りを一括でState更新（通常タスクのみ）
          for (const id of bulkIds) {
            if (activeTab !== "deleted" && onTaskDelete) {
              onTaskDelete(id)
            }
            // 削除済みタスクはState更新なし
          }
          
          // チェック状態をクリア
          if (isPartialDelete) {
            if (activeTab === "deleted") {
              const newCheckedDeletedTasks = new Set(checkedDeletedTasks)
              ids.forEach(id => newCheckedDeletedTasks.delete(id))
              setCheckedDeletedTasks(newCheckedDeletedTasks)
            } else {
              const newCheckedTasks = new Set(checkedTasks)
              ids.forEach(id => newCheckedTasks.delete(id))
              setCheckedTasks(newCheckedTasks)
            }
          } else {
            if (activeTab === "deleted") {
              setCheckedDeletedTasks(new Set())
            } else {
              setCheckedTasks(new Set())
            }
          }
          
          // 蓋を閉じる
          setTimeout(() => {
            setIsLidOpen?.(false)
          }, 500)
          
          // 削除ボタンを非表示
          setTimeout(() => {
            if (setIsDeleting) {
              setIsDeleting(false)
            }
          }, 1000)
          
          console.log('⚡ 混合削除完了:', { animated: animatedIds.length, bulk: bulkIds.length })
        }, 120, 'delete', async (id: number) => {
          // アニメーション付きアイテムの個別処理
          if (activeTab !== "deleted" && onTaskDelete) {
            onTaskDelete(id)
            
            try {
              await deleteTaskMutation.mutateAsync(id)
            } catch (error: unknown) {
              if (!(error instanceof Error && error.message?.includes('404'))) {
                console.error(`アニメーション削除エラー (ID: ${id}):`, error)
              }
            }
          } else if (activeTab === "deleted") {
            // 削除済みアイテムはAPI処理のみ（State更新はReact Query自動更新で行われる）
            try {
              await permanentDeleteTaskMutation.mutateAsync(id)
            } catch (error: unknown) {
              if (!(error instanceof Error && error.message?.includes('404'))) {
                console.error(`アニメーション完全削除エラー (ID: ${id}):`, error)
              }
            }
          }
        })
        
        // 残りのAPI処理をバックグラウンドで実行
        setTimeout(async () => {
          console.log('🌐 残りのAPI処理開始:', { count: bulkIds.length })
          for (const id of bulkIds) {
            try {
              if (activeTab === "deleted") {
                await permanentDeleteTaskMutation.mutateAsync(id)
              } else {
                await deleteTaskMutation.mutateAsync(id)
              }
            } catch (error: unknown) {
              if (!(error instanceof Error && error.message?.includes('404'))) {
                console.error(`一括削除エラー (ID: ${id}):`, error)
              }
            }
          }
          console.log('🌐 残りのAPI処理完了:', { count: bulkIds.length })
        }, 1000) // アニメーション開始から1秒後
        
        return
      }
      
      // 30件以下はアニメーション付き削除
      console.log('🎬 アニメーション削除:', { count: ids.length })
      const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation')
      animateBulkFadeOutCSS(ids, async () => {
        console.log('🎬 全アニメーション完了:', { ids: ids.length })
        
        // チェック状態をクリア（部分削除の場合は削除されたIDのみクリア）
        if (isPartialDelete) {
          if (activeTab === "deleted") {
            const newCheckedDeletedTasks = new Set(checkedDeletedTasks)
            ids.forEach(id => newCheckedDeletedTasks.delete(id))
            setCheckedDeletedTasks(newCheckedDeletedTasks)
          } else {
            const newCheckedTasks = new Set(checkedTasks)
            ids.forEach(id => newCheckedTasks.delete(id))
            setCheckedTasks(newCheckedTasks)
          }
        } else {
          // 通常削除の場合は全クリア
          if (activeTab === "deleted") {
            setCheckedDeletedTasks(new Set())
          } else {
            setCheckedTasks(new Set())
          }
        }
        
        // 500ms後に蓋を閉じる
        setTimeout(() => {
          setIsLidOpen?.(false)
        }, 500)
        
        // 削除ボタンを3秒後に非表示
        console.log('⏰ タイマー設定:', { hasSetIsDeleting: !!setIsDeleting })
        timerRef.current.isDeleting = setTimeout(() => {
          console.log('🚫 削除ボタン非表示 実行', { hasSetIsDeleting: !!setIsDeleting })
          if (setIsDeleting) {
            setIsDeleting(false)
          } else {
            console.error('❌ setIsDeletingが未定義')
          }
        }, 3000)
        
        // 個別APIで実行済みのため、ここでの一括API処理は不要
        console.log('🎊 全アニメーション・API処理完了:', { ids: ids.length })
      }, 120, 'delete', async (id: number) => {
        // 各アイテムのアニメーション完了時に個別DOM操作 + API実行
        console.log('🎯 個別アニメーション完了:', { id })
        if (activeTab !== "deleted" && onTaskDelete) {
          onTaskDelete(id)
          console.log('🔄 個別State更新完了:', { id })
          
          // 個別API実行（自動更新あり）
          try {
            await deleteTaskMutation.mutateAsync(id)
            console.log('🌐 個別API完了:', { id })
          } catch (error: unknown) {
            if (!(error instanceof Error && error.message?.includes('404'))) {
              console.error(`個別API削除エラー (ID: ${id}):`, error)
            }
          }
        } else if (activeTab === "deleted") {
          // 削除済みアイテムの完全削除はState更新なし、API処理のみ
          try {
            await permanentDeleteTaskMutation.mutateAsync(id)
            console.log('🌐 個別完全削除API完了:', { id })
          } catch (error: unknown) {
            if (!(error instanceof Error && error.message?.includes('404'))) {
              console.error(`個別完全削除エラー (ID: ${id}):`, error)
            }
          }
        }
      })
    } else {
      // アニメーションなしの場合は即座に処理
      // 通常タスクのみState更新
      if (activeTab !== "deleted" && onTaskDelete) {
        for (const id of ids) {
          onTaskDelete(id)
        }
      }
      // 削除済みタスクはState更新なし
      // 選択状態をクリア (UI即座更新)
      if (activeTab === "deleted") {
        setCheckedDeletedTasks(new Set())
      } else {
        setCheckedTasks(new Set())
      }
      
      // API処理を即座に実行
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
    }
  }

  const handleBulkDelete = async () => {
    const targetIds = activeTab === "deleted" 
      ? Array.from(checkedDeletedTasks)
      : Array.from(checkedTasks)

    // タスクの場合は1件からモーダル表示（削除済み・通常問わず）
    const threshold = 1
    
    // 100件超えの場合は最初の100件のみ処理
    const actualTargetIds = targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds
    const isLimitedDelete = targetIds.length > 100

    // 削除ボタンを押した瞬間に蓋を開く
    setIsDeleting?.(true)
    setIsLidOpen?.(true)

    console.log('🗑️ 削除開始:', { 
      selected: targetIds.length, 
      actualDelete: actualTargetIds.length, 
      activeTab,
      isLimited: isLimitedDelete 
    })
    
    if (isLimitedDelete) {
      // 100件制限のモーダル表示
      await bulkDelete.confirmBulkDelete(
        actualTargetIds, 
        0, // 即座にモーダル表示
        (ids) => executeDeleteWithAnimation(ids, true), // 選択状態を部分的にクリア
        `${targetIds.length}件選択されています。\n一度に削除できる上限は100件です。`
      )
    } else {
      // 通常の確認モーダル
      await bulkDelete.confirmBulkDelete(actualTargetIds, threshold, executeDeleteWithAnimation)
    }
  }

  const DeleteModal = () => (
    <BulkDeleteConfirmation
      isOpen={bulkDelete.isModalOpen}
      onClose={() => {
        console.log('Cancel')
        // キャンセル時に蓋を閉じる
        setIsDeleting?.(false)
        setTimeout(() => {
          setIsLidOpen?.(false)
        }, 300)
        bulkDelete.handleCancel()
      }}
      onConfirm={async () => {
        console.log('Confirm modal')
        await bulkDelete.handleConfirm(executeDeleteWithAnimation)
      }}
      count={bulkDelete.targetIds.length}
      itemType="task"
      deleteType={activeTab === "deleted" ? "permanent" : "normal"}
      isLoading={bulkDelete.isDeleting}
      customMessage={bulkDelete.customMessage}
    />
  )

  return {
    handleBulkDelete,
    DeleteModal,
  }
}