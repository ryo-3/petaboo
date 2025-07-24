import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAnimatedCounterOptions {
  totalItems: number;           // 全体の削除アイテム数
  remainingItems: number;       // 削除後の残りアイテム数  
  animationDuration: number;    // DOM削除完了までの実測秒数
  updateInterval?: number;      // 更新間隔（デフォルト: 200ms）
  easing?: (t: number) => number; // イージング関数
  onComplete?: () => void;      // アニメーション完了時のコールバック
}

interface UseAnimatedCounterReturn {
  currentCount: number;         // 現在の表示カウント
  startAnimation: () => void;   // アニメーション開始
  stopAnimation: () => void;    // アニメーション停止
  isAnimating: boolean;         // アニメーション中フラグ
}

// 削除用のイージング関数
const deleteEasing = {
  // 最初ゆっくり、徐々に加速
  easeIn: (t: number) => Math.pow(t, 1.8),
  
  // 最初速く、後半ゆっくり  
  easeOut: (t: number) => 1 - Math.pow(1 - t, 1.8),
  
  // 自然な削除感
  natural: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
};

/**
 * アニメーション付きカウンター
 * 削除・復元処理中にバッジカウントをリアルタイムに変化させる
 */
export function useAnimatedCounter({
  totalItems,
  remainingItems,
  animationDuration,
  updateInterval = 200,
  easing = deleteEasing.natural,
  onComplete
}: UseAnimatedCounterOptions): UseAnimatedCounterReturn {
  const [currentCount, setCurrentCount] = useState(totalItems);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // 完了フラグ
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const startCountRef = useRef<number>(totalItems);
  const finalCountRef = useRef<number | null>(null); // 完了時の最終値を保持

  const stopAnimation = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  const startAnimation = useCallback(() => {
    // 既に実行中の場合は停止
    stopAnimation();
    
    setIsAnimating(true);
    setIsCompleted(false); // 完了フラグをリセット
    finalCountRef.current = null; // 最終値もリセット
    startTimeRef.current = Date.now();
    startCountRef.current = currentCount;
    
    console.log(`🚀 カウンターアニメーション開始時刻:`, Date.now(), { currentCount, remainingItems, animationDuration });
    
    const targetChange = remainingItems - startCountRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      if (progress >= 1) {
        // アニメーション完了
        setCurrentCount(remainingItems);
        finalCountRef.current = remainingItems; // 最終値を保存
        setIsCompleted(true); // 完了マーク
        stopAnimation();
        onComplete?.();
        console.log('✅ カウンターアニメーション完了時刻:', Date.now(), { 最終値: remainingItems });
        return;
      }
      
      // イージング関数を適用した進捗
      const easedProgress = easing(progress);
      
      // 現在のカウント値を計算
      const newCount = Math.round(
        startCountRef.current + (targetChange * easedProgress)
      );
      
      setCurrentCount(newCount);
      
      // デバッグログ（動作確認のため一時的に有効化）
    }, updateInterval);
  }, [currentCount, remainingItems, animationDuration, updateInterval, easing, onComplete, stopAnimation]);

  // コンポーネントのアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // totalItemsが変更された場合、カウントを更新（アニメーション中・完了後でない場合のみ）
  useEffect(() => {
    if (!isAnimating && !isCompleted) {
      setCurrentCount(totalItems);
    }
  }, [totalItems, isAnimating, isCompleted]);

  return {
    currentCount,
    startAnimation,
    stopAnimation,
    isAnimating: isAnimating || isCompleted // アニメーション中または完了後はtrue
  };
}