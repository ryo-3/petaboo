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
    console.log('🔧 useDelayedButtonVisibility:', { shouldShow, showButton, isAnimating, delayMs });
    
    if (shouldShow && !showButton) {
      // 表示する場合はすぐに表示
      console.log('📤 ボタンを表示');
      setShowButton(true);
    } else if (!shouldShow && showButton) {
      // 非表示にする場合
      if (delayMs === 0 || !isAnimating) {
        // 遅延なしまたはアニメーション中でなければ即座に非表示
        console.log('📤 ボタンを即座に非表示');
        setShowButton(false);
      } else if (isAnimating) {
        // アニメーション中は指定時間後に非表示
        console.log('📤 ボタンを遅延非表示:', delayMs);
        const timer = setTimeout(() => {
          setShowButton(false);
        }, delayMs);
        return () => clearTimeout(timer);
      }
    }
  }, [shouldShow, showButton, isAnimating, delayMs]);

  return showButton;
}