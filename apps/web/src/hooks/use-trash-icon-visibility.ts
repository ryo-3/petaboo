import { useEffect, useRef } from 'react';

/**
 * ゴミ箱アイコンの表示/非表示を監視するフック
 */
export function useTrashIconVisibility() {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    // ゴミ箱アイコンを監視
    const observeTrashIcon = () => {
      const trashIcon = document.querySelector('[data-trash-icon]');
      if (!trashIcon) {
        console.log('🗑️ ゴミ箱アイコンが見つかりません');
        return;
      }

      console.log('👀 ゴミ箱アイコン監視開始');

      // 親要素を監視（アイコン自体の削除を検知）
      const parentElement = trashIcon.parentElement;
      if (!parentElement) return;

      observerRef.current = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // 子要素の削除を監視
          if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.querySelector('[data-trash-icon]') || element.matches('[data-trash-icon]')) {
                  console.log('🗑️❌ ゴミ箱アイコンがDOMから削除されました');
                }
              }
            });
          }
        });
      });

      observerRef.current.observe(parentElement, {
        childList: true,
        subtree: true,
      });

      // 表示状態の変化も監視
      const visibilityObserver = new MutationObserver(() => {
        const currentIcon = document.querySelector('[data-trash-icon]');
        if (currentIcon) {
          const styles = window.getComputedStyle(currentIcon.closest('button') || currentIcon);
          const isVisible = styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
          console.log('🗑️👁️ ゴミ箱アイコン表示状態:', { 
            display: styles.display, 
            visibility: styles.visibility, 
            opacity: styles.opacity,
            isVisible 
          });
        }
      });

      const buttonContainer = trashIcon.closest('button');
      if (buttonContainer) {
        visibilityObserver.observe(buttonContainer, {
          attributes: true,
          attributeFilter: ['style', 'class'],
        });
      }
    };

    // 少し遅延してから監視開始（DOM構築完了を待つ）
    const timer = setTimeout(observeTrashIcon, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 手動でゴミ箱アイコンの状態をチェックする関数
  const checkTrashIconStatus = () => {
    const trashIcon = document.querySelector('[data-trash-icon]');
    if (trashIcon) {
      const button = trashIcon.closest('button');
      const deleteButtonDiv = button?.closest('.delete-button');
      const buttonContainer = deleteButtonDiv?.parentElement; // ButtonContainer
      const bulkActionButtons = buttonContainer?.parentElement; // BulkActionButtons
      
      // 各レベルの表示状態をチェック
      const getVisibilityInfo = (element: Element | null) => {
        if (!element) return null;
        const styles = window.getComputedStyle(element);
        return {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          className: element.className,
          isVisible: styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0
        };
      };
      
      console.log('🗑️🔍 ゴミ箱アイコン詳細状態:', {
        timestamp: new Date().toISOString(),
        アイコン存在: !!trashIcon,
        ボタン情報: getVisibilityInfo(button || null),
        DeleteButtonDiv情報: getVisibilityInfo(deleteButtonDiv || null),
        ButtonContainer情報: getVisibilityInfo(buttonContainer || null),
        BulkActionButtons情報: getVisibilityInfo(bulkActionButtons || null),
        全体的な表示: !!trashIcon && getVisibilityInfo(bulkActionButtons || null)?.isVisible
      });
    } else {
      console.log('🗑️❌ ゴミ箱アイコンが存在しません:', new Date().toISOString());
    }
  };

  return { checkTrashIconStatus };
}