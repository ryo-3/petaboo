// アニメーション間隔の定数
export const DELETE_ANIMATION_INTERVAL = 80; // ms

/**
 * CSS変数からアニメーション時間を取得するヘルパー関数
 * @param name アニメーションタイプ
 * @returns アニメーション時間（ミリ秒）
 */
const getAnimationDuration = (name: 'editor' | 'bulk'): number => {
  const varName = `--${name}-animation-duration`;
  const duration = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(varName)
  );
  
  // フォールバック値
  return duration || (name === 'editor' ? 1000 : 300);
};


/**
 * エディター削除アニメーション
 * エディター要素をゴミ箱まで移動させるアニメーション
 */
export function animateEditorContentToTrashCSS(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  // CSS変数からアニメーション時間を取得（自動同期）
  const editorAnimationDuration = getAnimationDuration('editor');
  
  const editorRect = editorElement.getBoundingClientRect();
  
  // 固定サイズ
  const fixedWidth = 400;
  const fixedHeight = 200;
  
  // アニメーション用クローン作成
  const clone = editorElement.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.top = `${editorRect.top}px`;
  clone.style.left = `${editorRect.left}px`;
  clone.style.width = `${fixedWidth}px`;
  clone.style.height = `${fixedHeight}px`;
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  
  // 元要素を非表示（ゴミ箱ボタンは除く）
  editorElement.style.visibility = 'hidden';
  editorElement.style.pointerEvents = 'none';
  
  // ゴミ箱ボタンは表示を維持
  const trashButton = editorElement.querySelector('[data-right-panel-trash]') as HTMLElement;
  if (trashButton) {
    trashButton.style.visibility = 'visible';
    trashButton.style.pointerEvents = 'auto';
  }
  
  // 画面右下16pxまでの移動距離計算
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // ゴミ箱の位置（画面右下から16px）
  const trashX = screenWidth - 16 - 20; // ゴミ箱アイコン幅の半分
  const trashY = screenHeight - 16 - 20; // ゴミ箱アイコン高さの半分
  
  // 現在位置からゴミ箱までの移動距離
  const moveX = trashX - (editorRect.left + fixedWidth / 2);
  const moveY = trashY - (editorRect.top + fixedHeight / 2);
  
  clone.style.setProperty('--move-x', `${moveX}px`);
  clone.style.setProperty('--move-y', `${moveY}px`);
  
  
  // クローンをDOMに追加
  document.body.appendChild(clone);
  
  // CSSアニメーション開始
  clone.classList.add('editor-delete-animation');
  
  // アニメーション完了後の処理（CSS変数から自動取得した時間を使用）
  setTimeout(() => {
    document.body.removeChild(clone);
    onComplete?.();
  }, editorAnimationDuration);
}

/**
 * 一括フェードアウトアニメーション
 * 複数アイテムを順次フェードアウトさせる
 */
export function animateBulkFadeOutCSS(
  itemIds: number[],
  onComplete?: () => void,
  onCancel?: () => void,
  delay: number = 120,
  actionType: 'delete' | 'restore' = 'delete'
) {
  // CSS変数からアニメーション時間を取得（自動同期）
  const bulkAnimationDuration = getAnimationDuration('bulk');
  
  // 重複を除去
  const uniqueItemIds = [...new Set(itemIds)];
  
  // DOM順序でアイテムをソートしてアニメーションの順序を正しくする
  const allElements = document.querySelectorAll('[data-memo-id], [data-task-id]');
  const domOrder: number[] = [];
  
  // DOM順序で要素を走査し、uniqueItemIdsに含まれるもののみを一度だけ抽出
  allElements.forEach((el) => {
    const memoId = el.getAttribute('data-memo-id');
    const taskId = el.getAttribute('data-task-id');
    const id = memoId || taskId;
    const numId = id ? parseInt(id, 10) : null;
    
    // uniqueItemIdsに含まれ、まだdomOrderに追加されていないIDのみを追加
    if (numId && uniqueItemIds.includes(numId) && !domOrder.includes(numId)) {
      domOrder.push(numId);
    }
  });
  
  // DOM順序でソートされた対象IDのみ（重複なし）
  const sortedItemIds = domOrder;
  
  
  let completedCount = 0;
  const totalItems = sortedItemIds.length;
  const processedItems = new Set<number>(); // 処理済みアイテムを追跡
  let isCancelled = false; // キャンセルフラグ
  const timeoutIds: NodeJS.Timeout[] = []; // setTimeout IDを保持
  
  // 削除の場合は何もしない（isLidOpenプロパティで制御されるため）
  
  // キャンセル処理関数
  const cancelAllProcessing = () => {
    if (isCancelled) return;
    
    isCancelled = true;
    timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    onCancel?.();
  };

  // DOM順序でソートされたアイテムに順次フェードアウトアニメーション適用
  sortedItemIds.forEach((id, index) => {
    const timeoutId = setTimeout(() => {
      // キャンセル済みなら処理しない
      if (isCancelled) return;
      
      // 既に処理済みの場合はスキップ
      if (processedItems.has(id)) {
        return;
      }
      processedItems.add(id);
      
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      
      if (itemElement) {
        
        
        // フェードアウトアニメーション開始
        itemElement.classList.add('bulk-fade-out-animation');
        
        
        // アニメーション完了時の処理（空間維持・透明のみ）
        setTimeout(() => {
          // アニメーションクラスを削除して透明にするだけ
          itemElement.classList.remove('bulk-fade-out-animation');
          itemElement.style.opacity = '0';
          itemElement.style.pointerEvents = 'none'; // クリック無効化
          
          // カウントアップ
          completedCount++;
          
          // 全てのアイテムが完了したらコールバック実行
          if (completedCount === totalItems) {
            // ゴミ箱の蓋はfinalizeAnimationで統一的に閉じる（500ms後）
            onComplete?.();
          }
        }, bulkAnimationDuration); // アニメーション開始から300ms後に完了
      } else {
        // 復元時は要素が既に削除されている可能性がある
        if (actionType === 'restore') {
          // カウントアップ
          completedCount++;
          
          // 全てのアイテムが完了したらコールバック実行
          if (completedCount === totalItems) {
            // 復元の場合はゴミ箱の蓋を閉じる処理は不要
            onComplete?.();
          }
        } else {
          // 全体をキャンセル
          cancelAllProcessing();
          return;
        }
      }
    }, index * delay);
    
    // timeout IDを配列に保存
    timeoutIds.push(timeoutId);
  });
}