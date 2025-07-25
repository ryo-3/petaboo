import { DELETE_ANIMATION_INTERVAL } from './deleteAnimation'

interface ExecuteAnimationParams {
  ids: number[]
  isPartial?: boolean
  originalTotalCount?: number
  buttonRef?: React.RefObject<HTMLButtonElement | null>
  dataAttribute: string // 'data-memo-id' or 'data-task-id'
  
  // Callbacks
  onStateUpdate: (id: number) => void
  onCheckStateUpdate: (ids: number[], isPartial: boolean) => void
  onApiCall: (id: number) => Promise<void>
  
  // Animation functions
  initializeAnimation: (totalCount: number, isPartial?: boolean) => void
  startCountdown: (totalCount: number, targetCount: number) => void
  finalizeAnimation: (setIsProcessing?: (value: boolean) => void, setIsLidOpen?: (value: boolean) => void, isPartial?: boolean) => void
  
  // State setters
  setIsProcessing?: (value: boolean) => void
  setIsLidOpen?: (value: boolean) => void
}

/**
 * 共通の削除・復元アニメーション実行関数
 */
export async function executeWithAnimation({
  ids,
  isPartial = false,
  originalTotalCount,
  buttonRef,
  dataAttribute,
  onStateUpdate,
  onCheckStateUpdate,
  onApiCall,
  initializeAnimation,
  startCountdown,
  finalizeAnimation,
  setIsProcessing,
  setIsLidOpen,
}: ExecuteAnimationParams) {
  // 実際に処理するアイテム数を記録
  const actualProcessCount = ids.length
  // 元々選択されていた総数（部分処理の場合）
  const displayTotalCount = originalTotalCount || actualProcessCount
  
  // ボタンの位置を取得
  const buttonRect = buttonRef?.current?.getBoundingClientRect()
  
  // アニメーションが必要な場合
  if (buttonRect) {
    // 蓋を開く
    setIsLidOpen?.(true)
    
    // アニメーション初期化
    initializeAnimation(displayTotalCount, isPartial)
    
    const { animateBulkFadeOutCSS } = await import('./deleteAnimation')
    
    // const startTime = Date.now()
    
    // カウントダウン対象の判定と開始タイミング計算
    const remainingCountAfterLimit = displayTotalCount - ids.length
    
    // カウントダウン開始
    startCountdown(displayTotalCount, remainingCountAfterLimit)
    
    // 要素をチェック
    
    animateBulkFadeOutCSS(
      ids, 
      async () => {
        // 正常完了時の処理
        // const endTime = Date.now()
        // const duration = (endTime - startTime) / 1000
        
        // 一括State更新（DOM削除）
        ids.forEach(id => onStateUpdate(id))
        
        // チェック状態をクリア
        onCheckStateUpdate(ids, isPartial)
        
        // アニメーション完了処理
        finalizeAnimation(setIsProcessing, setIsLidOpen, isPartial)
        
        // アニメーション完了後にAPI実行（バックグラウンド処理）
        setTimeout(async () => {
          const apiPromises = ids.map(async (id) => {
            try {
              await onApiCall(id)
            } catch {
              // APIエラーはミューテーションのエラーハンドリングで処理される
            }
          })
          
          await Promise.all(apiPromises)
        }, 100)
      },
      () => {
        // キャンセル時の処理
        
        // カウンターアニメーションも停止する必要がある場合
        // finalizeAnimationを呼ぶ前に、アニメーションのキャンセルを行う
        
        // 状態をリセット
        finalizeAnimation(setIsProcessing, setIsLidOpen, isPartial)
        
        // カウンターキャンセル通知を先に送信
        window.dispatchEvent(new CustomEvent('bulkAnimationCancel', {
          detail: { 
            type: dataAttribute.includes('memo') ? 'memo' : 'task',
            processType: 'delete'
          }
        }));
        
        // キャンセル通知を表示
        window.dispatchEvent(new CustomEvent('bulkProcessCancelled', {
          detail: { 
            type: dataAttribute.includes('memo') ? 'memo' : 'task',
            processType: 'delete',
            reason: 'element_not_found'
          }
        }));
      },
      DELETE_ANIMATION_INTERVAL
    )
  } else {
    // アニメーションなしの場合は即座に処理
    ids.forEach(id => onStateUpdate(id))
    
    // 選択状態をクリア
    onCheckStateUpdate(ids, isPartial)
    
    // API処理を即座に実行
    for (const id of ids) {
      try {
        await onApiCall(id)
      } catch {
        // 処理エラーはミューテーションのエラーハンドリングで処理される
      }
    }
  }
}