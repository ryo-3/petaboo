import { useEffect, useRef, useState } from 'react'
import { useRestoreNote } from '@/src/hooks/use-notes'
import { useBulkDelete, BulkRestoreConfirmation } from '@/components/ui/modals'
import type { DeletedMemo } from '@/src/types/memo'
import { DELETE_ANIMATION_INTERVAL } from '@/src/utils/deleteAnimation'
import React from 'react'

interface UseMemosBulkRestoreProps {
  checkedDeletedMemos: Set<number>
  setCheckedDeletedMemos: (memos: Set<number>) => void
  deletedNotes?: DeletedMemo[]
  onDeletedMemoRestore?: (id: number) => void
  restoreButtonRef?: React.RefObject<HTMLButtonElement | null>
  setIsRestoring?: (isRestoring: boolean) => void
  setIsLidOpen?: (isOpen: boolean) => void
}

export function useMemosBulkRestore({
  checkedDeletedMemos,
  setCheckedDeletedMemos,
  deletedNotes,
  onDeletedMemoRestore,
  restoreButtonRef,
  setIsRestoring,
  setIsLidOpen
}: UseMemosBulkRestoreProps) {
  const restoreNoteMutation = useRestoreNote()
  const bulkRestore = useBulkDelete() // 削除と同じモーダルロジックを使用
  
  // タイマーIDを保持
  const timerRef = useRef<{ isRestoring?: NodeJS.Timeout; clearChecked?: NodeJS.Timeout }>({})
  
  // 部分復元中フラグ（自動クリーンアップを無効にするため）
  const [isPartialRestoring, setIsPartialRestoring] = useState(false)
  
  // シンプルなカウンター（削除と同じ仕組み）
  const [displayCount, setDisplayCount] = useState(0)
  const [isCountingActive, setIsCountingActive] = useState(false)

  // チェック状態が変更されたらタイマーをクリア
  useEffect(() => {
    if (checkedDeletedMemos.size > 0) {
      // 新しい選択があったらタイマーをクリア
      if (timerRef.current.clearChecked) {
        clearTimeout(timerRef.current.clearChecked)
        timerRef.current.clearChecked = undefined
      }
      if (timerRef.current.isRestoring) {
        clearTimeout(timerRef.current.isRestoring)
        timerRef.current.isRestoring = undefined
      }
    }
  }, [checkedDeletedMemos])

  // チェック状態のクリーンアップ - 復元されたメモのチェックを解除（部分復元中は無効）
  useEffect(() => {
    if (deletedNotes && !isPartialRestoring) {
      const deletedMemoIds = new Set(deletedNotes.map(m => m.id))
      const newCheckedDeletedMemos = new Set(Array.from(checkedDeletedMemos).filter(id => deletedMemoIds.has(id)))
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos)
      }
    }
  }, [deletedNotes, checkedDeletedMemos, setCheckedDeletedMemos, isPartialRestoring])

  // 共通の復元処理関数（削除と同じパターン）
  const executeRestoreWithAnimation = async (ids: number[], isPartialRestore = false, originalTotalCount?: number) => {
    // 実際に復元するアイテム数を記録
    const actualRestoreCount = ids.length
    // 元々選択されていた総数（部分復元の場合）
    const displayTotalCount = originalTotalCount || actualRestoreCount
    // 部分復元の場合はフラグを設定
    if (isPartialRestore) {
      setIsPartialRestoring(true)
    }
    
    // 復元ボタンの位置を取得
    const buttonRect = restoreButtonRef?.current?.getBoundingClientRect()
    
    // アニメーションが必要な場合
    if (buttonRect) {
      // 蓋を開く
      setIsLidOpen?.(true)
      
      // 復元開始時は99+表示継続
      setDisplayCount(Math.min(displayTotalCount, 99))
      setIsCountingActive(true) // カウンター有効にして99+表示
      
      const { animateBulkFadeOutCSS } = await import('@/src/utils/deleteAnimation')
      
      const startTime = Date.now()
      console.log(`⏱️ 復元アニメーション開始: ${startTime} (${ids.length}件)`)
      
      // カウントダウン対象の判定と開始タイミング計算
      const remainingCountAfterLimit = displayTotalCount - ids.length
      
      // カウントダウンが必要な場合（99以下になる場合）
      if (remainingCountAfterLimit <= 99) {
        // カウンター開始数値を決定（99以下の場合は実際の開始数値）
        const startCount = Math.min(displayTotalCount, 99)
        const itemsUntilStart = displayTotalCount - startCount
        const delayUntilStart = itemsUntilStart * DELETE_ANIMATION_INTERVAL
        
        setTimeout(() => {
          console.log(`🎯 復元カウンター開始: 残り${startCount}個`)
          
          // カウンターを開始数値から段階的に減らす
          let currentCount = startCount
          const targetCount = remainingCountAfterLimit
          const decrementInterval = DELETE_ANIMATION_INTERVAL // 80msごとに減少（アニメーションと同期）
          
          // 最初の数値を設定してからカウンター開始（ちらつき防止）
          setDisplayCount(startCount)
          setIsCountingActive(true)
          
          const counterTimer = setInterval(() => {
            if (currentCount <= targetCount) {
              clearInterval(counterTimer)
              setDisplayCount(targetCount)
              console.log(`🏁 復元カウンター終了: 残り${targetCount}個`)
            } else {
              currentCount--
              setDisplayCount(currentCount)
            }
          }, decrementInterval)
        }, delayUntilStart)
      }
      
      // 復元の場合は、まずアニメーション実行（削除済みタブから要素を消す）
      console.log('🎬 復元アニメーション開始 - 削除済みタブから要素消去')
      
      // 削除済みタブの要素をチェック
      ids.forEach(id => {
        const element = document.querySelector(`[data-memo-id="${id}"]`)
        console.log(`📋 復元対象要素チェック: ID ${id}`, {
          要素存在: !!element,
          要素情報: element ? {
            tagName: element.tagName,
            className: element.className,
            親要素: element.parentElement?.tagName
          } : null
        })
      })
      
      animateBulkFadeOutCSS(ids, async () => {
        const endTime = Date.now()
        const duration = (endTime - startTime) / 1000
        console.log(`🏁 復元アニメーション完了: ${endTime} (実際: ${duration}秒)`)
        
        // カウンター停止（これ以上のコールバック実行を無効化）
        setIsCountingActive(false)
        
        // 一括State更新（DOM削除）
        if (onDeletedMemoRestore) {
          ids.forEach(id => onDeletedMemoRestore(id))
        }
        
        // チェック状態をクリア（部分復元の場合は復元されたIDのみクリア）
        if (isPartialRestore) {
          const newCheckedDeletedMemos = new Set(checkedDeletedMemos)
          ids.forEach(id => newCheckedDeletedMemos.delete(id))
          setCheckedDeletedMemos(newCheckedDeletedMemos)
        } else {
          // 通常復元の場合は全クリア
          setCheckedDeletedMemos(new Set())
        }
        
        // 500ms後に蓋を閉じる
        setTimeout(() => {
          setIsLidOpen?.(false)
        }, 500)
        
        // 復元ボタンを3秒後に非表示
        timerRef.current.isRestoring = setTimeout(() => {
          if (setIsRestoring) {
            setIsRestoring(false)
          } else {
            console.error('❌ setIsRestoringが未定義')
          }
        }, 3000)
        
        // アニメーション完了後にAPI実行（バックグラウンド処理）
        setTimeout(async () => {
          console.log('🔄 復元API実行開始（アニメーション完了後）')
          const apiPromises = ids.map(async (id) => {
            try {
              await restoreNoteMutation.mutateAsync(id)
            } catch (error: unknown) {
              if (!(error instanceof Error && error.message?.includes('404'))) {
                console.error(`API復元エラー (ID: ${id}):`, error)
              }
            }
          })
          
          await Promise.all(apiPromises)
          console.log('🔄 復元API実行完了（アニメーション完了後）')
        }, 100)
      }, DELETE_ANIMATION_INTERVAL, 'restore')
    } else {
      // アニメーションなしの場合は即座に処理
      if (onDeletedMemoRestore) {
        for (const id of ids) {
          onDeletedMemoRestore(id)
        }
      }
      // 選択状態をクリア (UI即座更新) - 部分復元の場合は復元したIDのみ除外
      if (isPartialRestore) {
        const newCheckedDeletedMemos = new Set(checkedDeletedMemos)
        ids.forEach(id => newCheckedDeletedMemos.delete(id))
        setCheckedDeletedMemos(newCheckedDeletedMemos)
      } else {
        setCheckedDeletedMemos(new Set())
      }
      
      // API処理を即座に実行
      for (const id of ids) {
        try {
          await restoreNoteMutation.mutateAsync(id)
        } catch (error) {
          console.error(`メモ復元エラー (ID: ${id}):`, error)
        }
      }
      
      // 部分復元フラグを解除
      if (isPartialRestore) {
        setTimeout(() => setIsPartialRestoring(false), 100)
      }
    }
  }

  const handleBulkRestore = async () => {
    const targetIds = Array.from(checkedDeletedMemos)

    // 復元の場合は1件からモーダル表示
    const threshold = 1
    
    // 100件超えの場合は最初の100件のみ処理
    const actualTargetIds = targetIds.length > 100 ? targetIds.slice(0, 100) : targetIds
    const isLimitedRestore = targetIds.length > 100

    // 復元ボタンを押した瞬間の状態設定（カウンター維持）
    setIsRestoring?.(true)
    setIsLidOpen?.(true)
    
    // モーダル表示中はカウンターを無効化して通常表示にする
    setIsCountingActive(false)

    if (isLimitedRestore) {
      // 100件制限のモーダル表示
      await bulkRestore.confirmBulkDelete(
        actualTargetIds, 
        0, // 即座にモーダル表示
        async (ids: number[], isPartialRestore = false) => {
          await executeRestoreWithAnimation(ids, isPartialRestore, targetIds.length)
        },
        `${targetIds.length}件選択されています。\\n一度に復元できる上限は100件です。`,
        true // isPartialRestore
      )
    } else {
      // 通常の確認モーダル
      await bulkRestore.confirmBulkDelete(actualTargetIds, threshold, async (ids: number[]) => {
        await executeRestoreWithAnimation(ids)
      })
    }
  }

  const RestoreModal: React.FC = () => (
    <BulkRestoreConfirmation
      isOpen={bulkRestore.isModalOpen}
      onClose={() => {
        // キャンセル時に蓋を閉じるが、カウンターは元の状態に戻す
        setIsRestoring?.(false)
        setIsCountingActive(false) // カウンター無効化してバッチを通常表示に戻す
        setTimeout(() => {
          setIsLidOpen?.(false)
        }, 300)
        bulkRestore.handleCancel()
      }}
      onConfirm={async () => {
        await bulkRestore.handleConfirm()
      }}
      count={bulkRestore.targetIds.length}
      itemType="memo"
      isLoading={bulkRestore.isDeleting}
      customMessage={bulkRestore.customMessage}
    />
  )

  // 現在の復元カウント（通常時は実際のサイズ、復元中はアニメーション用）
  const currentRestoreCount = checkedDeletedMemos.size
  const finalDisplayCount = isCountingActive ? displayCount : currentRestoreCount

  // デバッグログ
  console.log('🔄 復元カウンター状態:', {
    isCountingActive,
    displayCount,
    currentRestoreCount,
    finalDisplayCount,
    checkedDeletedMemosSize: checkedDeletedMemos.size
  })

  return {
    handleBulkRestore,
    RestoreModal,
    // カウンターアクティブ時はdisplayCount、それ以外は実際のカウント
    currentDisplayCount: finalDisplayCount,
  }
}