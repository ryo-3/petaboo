import { useEffect, useState } from 'react';

/**
 * 削除ボタンの遅延非表示処理を管理するカスタムフック
 * 削除完了後もアニメーション完了まで3秒間ボタンを表示し続ける
 */
export function useDelayedButtonVisibility(
  shouldShow: boolean,
  isAnimating: boolean,
  delayMs: number = 3000
) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    console.log('🔍 useDelayedButtonVisibility状態:', { shouldShow, showButton, isAnimating });
    
    if (shouldShow && !showButton) {
      // 表示する場合はすぐに表示
      console.log('👀 ボタン表示: すぐに表示');
      setShowButton(true);
    } else if (!shouldShow && showButton && !isAnimating) {
      // 非表示にする場合は、アニメーション中でなければ指定時間後に非表示
      console.log(`⏰ ボタン非表示タイマー開始: ${delayMs}ms後に非表示`);
      const timer = setTimeout(() => {
        console.log('❌ ボタン非表示: タイマー実行');
        setShowButton(false);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [shouldShow, showButton, isAnimating, delayMs]);

  return showButton;
}