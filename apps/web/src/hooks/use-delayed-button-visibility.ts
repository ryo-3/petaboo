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
    if (shouldShow && !showButton) {
      // 表示する場合はすぐに表示
      setShowButton(true);
    } else if (!shouldShow && showButton) {
      // 非表示にする場合
      if (delayMs === 0) {
        // 遅延なしの場合のみ即座に非表示
        setShowButton(false);
      } else {
        // 遅延ありの場合は指定時間後に非表示（アニメーション状態に関係なく）
        const timer = setTimeout(() => {
          setShowButton(false);
        }, delayMs);
        return () => clearTimeout(timer);
      }
    }
  }, [shouldShow, showButton, isAnimating, delayMs]);

  return showButton;
}