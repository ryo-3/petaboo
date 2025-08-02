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

  // チェック状態が変更されたらタイマーをクリア（ただし、アニメーション実行中は除く）
  useEffect(() => {
    if (checkedItems.size > 0 && !isCountingActive) {
      clearTimers()
    }
  }, [checkedItems, isCountingActive])

  useEffect(() => {
    if (checkedDeletedItems && checkedDeletedItems.size > 0 && !isCountingActive) {
      clearTimers()
    }
  }, [checkedDeletedItems, isCountingActive])

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
    // カウントダウンが必要な場合（999以下になる場合）
    if (targetCount <= 999) {
      const startCount = Math.min(totalCount, 999)
      const itemsUntilStart = totalCount - startCount
      const delayUntilStart = itemsUntilStart * DELETE_ANIMATION_INTERVAL
      
      timerRef.current.countdownTimer = setTimeout(() => {
        // カウンターを開始数値から目標値まで段階的に減らす
        let currentCount = startCount
        const decrementInterval = DELETE_ANIMATION_INTERVAL
        
        // 最初の数値を設定してからカウンター開始（ちらつき防止）
        setDisplayCount(startCount)
        setIsCountingActive(true)
        
        const counterTimer = setInterval(() => {
          console.log('🔢 Countdown step:', currentCount)
          setDisplayCount(currentCount)
          
          // 目標値（削除後の残り数）に到達したら停止
          if (currentCount <= targetCount) {
            console.log('🎯 Reached target! Clearing interval and keeping final value visible for 1 second')
            clearInterval(counterTimer)
            // 最終値を1秒表示してからカウンター無効化
            setTimeout(() => {
              console.log('⏰ 1 second passed, deactivating counter')
              setIsCountingActive(false)
            }, 1000)
            return
          }
          
          currentCount--
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
    
    // 開始時は実際の数値を保持（1000以上の場合は999+として表示される）
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
    console.log('🏁 Finalizing animation');
    // カウンター制御はstartCountdown側に任せる
    
    // すぐに蓋を閉じる（カウンターの0表示と分離）
    setIsLidOpen?.(false)
    
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
    console.log('🛑 アニメーションキャンセル実行中...', { 
      isCountingActive, 
      isPartialProcessing, 
      displayCount,
      hasCounterInterval: !!timerRef.current.counterInterval
    });
    
    // 全てのタイマーをクリア（カウンターのsetIntervalも含む）
    clearTimers()
    
    // 状態をリセット
    setIsCountingActive(false)
    setIsPartialProcessing(false)
    setDisplayCount(0)
    
    // 処理状態をリセット
    setIsProcessing?.(false)
    setIsLidOpen?.(false)
    
    console.log('✅ アニメーションキャンセル完了');
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