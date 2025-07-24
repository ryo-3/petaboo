import { useRef, useState, useEffect } from 'react'
import { DELETE_ANIMATION_INTERVAL } from '@/src/utils/deleteAnimation'

interface UseBulkAnimationProps {
  checkedItems: Set<number>
  checkedDeletedItems?: Set<number>
}

/**
 * 一括削除・復元のカウントダウンアニメーション共通ロジック
 */
export function useBulkAnimation({ checkedItems, checkedDeletedItems }: UseBulkAnimationProps) {
  // タイマーIDを保持
  const timerRef = useRef<{ 
    isProcessing?: NodeJS.Timeout; 
    clearChecked?: NodeJS.Timeout;
    countdownTimer?: NodeJS.Timeout;
    counterInterval?: NodeJS.Timeout;
  }>({})
  
  // 部分処理中フラグ（自動クリーンアップを無効にするため）
  const [isPartialProcessing, setIsPartialProcessing] = useState(false)
  
  // シンプルなカウンター
  const [displayCount, setDisplayCount] = useState(0)
  const [isCountingActive, setIsCountingActive] = useState(false)

  // チェック状態が変更されたらタイマーをクリア
  useEffect(() => {
    if (checkedItems.size > 0) {
      clearTimers()
    }
  }, [checkedItems])

  useEffect(() => {
    if (checkedDeletedItems && checkedDeletedItems.size > 0) {
      clearTimers()
    }
  }, [checkedDeletedItems])

  const clearTimers = () => {
    if (timerRef.current.clearChecked) {
      clearTimeout(timerRef.current.clearChecked)
      timerRef.current.clearChecked = undefined
    }
    if (timerRef.current.isProcessing) {
      clearTimeout(timerRef.current.isProcessing)
      timerRef.current.isProcessing = undefined
    }
    if (timerRef.current.countdownTimer) {
      clearTimeout(timerRef.current.countdownTimer)
      timerRef.current.countdownTimer = undefined
    }
    if (timerRef.current.counterInterval) {
      clearInterval(timerRef.current.counterInterval)
      timerRef.current.counterInterval = undefined
    }
  }

  /**
   * カウントダウンアニメーションを開始
   */
  const startCountdown = (totalCount: number, targetCount: number) => {
    // カウントダウンが必要な場合（99以下になる場合）
    if (targetCount <= 99) {
      const startCount = Math.min(totalCount, 99)
      const itemsUntilStart = totalCount - startCount
      const delayUntilStart = itemsUntilStart * DELETE_ANIMATION_INTERVAL
      
      timerRef.current.countdownTimer = setTimeout(() => {
        
        // カウンターを開始数値から段階的に減らす
        let currentCount = startCount
        const decrementInterval = DELETE_ANIMATION_INTERVAL
        
        // 最初の数値を設定してからカウンター開始（ちらつき防止）
        setDisplayCount(startCount)
        setIsCountingActive(true)
        
        const counterTimer = setInterval(() => {
          if (currentCount <= targetCount) {
            clearInterval(counterTimer)
            setDisplayCount(targetCount)
          } else {
            currentCount--
            setDisplayCount(currentCount)
          }
        }, decrementInterval)
        
        // カウンターのsetIntervalを管理のためtimerRefに保存
        timerRef.current.counterInterval = counterTimer
      }, delayUntilStart)
    }
  }

  /**
   * アニメーション開始時の初期設定
   */
  const initializeAnimation = (totalCount: number, isPartial = false) => {
    if (isPartial) {
      setIsPartialProcessing(true)
    }
    
    // 開始時は実際の数値を保持（100以上の場合は99+として表示される）
    setDisplayCount(totalCount)
    setIsCountingActive(true)
  }

  /**
   * アニメーション完了時の処理
   */
  const finalizeAnimation = (
    setIsProcessing?: (value: boolean) => void,
    setIsLidOpen?: (value: boolean) => void,
    isPartial = false
  ) => {
    // カウンター停止
    setIsCountingActive(false)
    
    // 500ms後に蓋を閉じる
    setTimeout(() => {
      setIsLidOpen?.(false)
    }, 500)
    
    // 処理状態をすぐに終了（useBulkDeleteButtonのタイマーに任せる）
    if (setIsProcessing) {
      setIsProcessing(false)
    }
    
    // 部分処理フラグを解除
    if (isPartial) {
      setTimeout(() => setIsPartialProcessing(false), 100)
    }
  }

  /**
   * モーダル表示中の状態設定
   */
  const setModalState = (
    setIsProcessing?: (value: boolean) => void,
    setIsLidOpen?: (value: boolean) => void
  ) => {
    setIsProcessing?.(true)
    setIsLidOpen?.(true)
    // モーダル表示中はカウンターを無効化して通常表示にする
    setIsCountingActive(false)
  }

  /**
   * モーダルキャンセル時の処理
   */
  const handleModalCancel = (
    setIsProcessing?: (value: boolean) => void,
    setIsLidOpen?: (value: boolean) => void
  ) => {
    setIsProcessing?.(false)
    setIsCountingActive(false) // カウンター無効化してバッチを通常表示に戻す
    setTimeout(() => {
      setIsLidOpen?.(false)
    }, 300)
  }

  /**
   * アニメーション強制キャンセル（タブ切り替え時など）
   */
  const cancelAnimation = (
    setIsProcessing?: (value: boolean) => void,
    setIsLidOpen?: (value: boolean) => void
  ) => {
    
    // 全てのタイマーをクリア（カウンターのsetIntervalも含む）
    clearTimers()
    
    // 状態をリセット
    setIsCountingActive(false)
    setIsPartialProcessing(false)
    setDisplayCount(0)
    
    // 処理状態をリセット
    setIsProcessing?.(false)
    setIsLidOpen?.(false)
  }

  return {
    // State
    displayCount,
    isCountingActive,
    isPartialProcessing,
    setIsPartialProcessing,
    
    // Functions
    startCountdown,
    initializeAnimation,
    finalizeAnimation,
    setModalState,
    handleModalCancel,
    cancelAnimation,
    clearTimers,
    
    // Refs
    timerRef,
  }
}