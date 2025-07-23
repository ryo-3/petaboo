// アニメーション間隔の定数
export const DELETE_ANIMATION_INTERVAL = 80; // ms

/**
 * CSS変数からアニメーション時間を取得するヘルパー関数
 * @param name アニメーションタイプ
 * @returns アニメーション時間（ミリ秒）
 */
export const getAnimationDuration = (name: 'editor' | 'bulk'): number => {
  const varName = `--${name}-animation-duration`;
  const duration = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(varName)
  );
  
  // フォールバック値
  return duration || (name === 'editor' ? 1000 : 300);
};

/**
 * 削除アイテム数に基づいてアニメーション完了時間を計算
 * @param itemCount 削除するアイテム数
 * @returns 予想される削除完了時間（ミリ秒）
 */
export const calculateDeleteDuration = (itemCount: number): number => {
  const bulkDuration = getAnimationDuration('bulk');
  
  // 実際の削除時間: 最後のアイテムのアニメーション開始時刻 + そのアニメーション時間
  // ただし100件制限があるので、最大100件で計算
  const actualItemCount = Math.min(itemCount, 100);
  return (actualItemCount - 1) * DELETE_ANIMATION_INTERVAL + bulkDuration;
};

// CSS版エディター削除アニメーション（Phase 1）- シンプル版
// ※重要: アニメーション時間はglobals.cssの:root --editor-animation-durationから自動取得します
export function animateEditorContentToTrashCSS(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  // CSS変数からアニメーション時間を取得（自動同期）
  const editorAnimationDuration = getAnimationDuration('editor');
  // console.log('🎨 CSS版エディター削除アニメーション開始（シンプル版）');
  
  // JS版と同様にクローンを作成
  const editorRect = editorElement.getBoundingClientRect();
  
  // 固定サイズ（JS版と同じ）
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
  
  // console.log('🎯 移動距離計算:', { 
  //   画面サイズ: { screenWidth, screenHeight },
  //   ゴミ箱位置: { trashX, trashY },
  //   開始位置中心: { x: editorRect.left + fixedWidth / 2, y: editorRect.top + fixedHeight / 2 },
  //   移動距離: { moveX, moveY }
  // });
  
  // クローンをDOMに追加
  document.body.appendChild(clone);
  
  // CSSアニメーション開始
  clone.classList.add('editor-delete-animation');
  
  // アニメーション完了後の処理（CSS変数から自動取得した時間を使用）
  setTimeout(() => {
    document.body.removeChild(clone);
    // console.log('🎨 CSS版エディター削除アニメーション完了');
    onComplete?.();
  }, editorAnimationDuration);
}

// 汎用CSS版フェードアウトアニメーション（即座DOM削除版）
// ※重要: アニメーション時間はglobals.cssの:root --bulk-animation-durationから自動取得します
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
  
  // console.log(`🚨🚨🚨 重要: DOM順序でソート完了 🚨🚨🚨`, { 
  //   元の順序: itemIds,
  //   DOM順序: domOrder,
  //   ソート後: sortedItemIds,
  //   順序が変わった: JSON.stringify(itemIds) !== JSON.stringify(sortedItemIds),
  //   元の順序詳細: itemIds.map((id, i) => ({ 元index: i, id })),
  //   ソート後詳細: sortedItemIds.map((id, i) => ({ 新index: i, id }))
  // });
  
  let completedCount = 0;
  const totalItems = sortedItemIds.length;
  const processedItems = new Set<number>(); // 処理済みアイテムを追跡
  let isCancelled = false; // キャンセルフラグ
  const timeoutIds: NodeJS.Timeout[] = []; // setTimeout IDを保持
  
  // ゴミ箱の蓋を開く（削除の場合のみ）
  const trashLid = document.querySelector('.trash-icon-lid') as HTMLElement;
  if (actionType === 'delete' && trashLid) {
    trashLid.classList.add('open');
  }
  
  // キャンセル処理関数
  const cancelAllProcessing = () => {
    if (isCancelled) return; // 既にキャンセル済み
    
    isCancelled = true;
    console.log('🚫 一括処理をキャンセルします - 全てのタイマーをクリア');
    
    // 全てのsetTimeoutをクリア
    timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    
    // ゴミ箱の蓋を閉じる
    if (actionType === 'delete' && trashLid) {
      trashLid.classList.remove('open');
    }
    
    // キャンセルコールバックを実行
    onCancel?.();
  };

  // DOM順序でソートされたアイテムに順次フェードアウトアニメーション適用
  sortedItemIds.forEach((id, index) => {
    const timeoutId = setTimeout(() => {
      // キャンセル済みなら処理しない
      if (isCancelled) return;
      
      // 既に処理済みの場合はスキップ
      if (processedItems.has(id)) {
        // console.log(`⚠️ 重複スキップ: ID ${id}`);
        return;
      }
      processedItems.add(id);
      // console.log(`✅ 処理開始: ID ${id}`);
      
      // console.log(`🎯 ${actionType === 'delete' ? '削除' : '復元'}フェードアウトアニメーション開始:`, { id, index, delay: index * delay });
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      
      if (itemElement) {
        // console.log(`🎯 CSS版${actionType === 'delete' ? '削除' : '復元'}フェードアウト:`, {
        //   id,
        //   index,
        //   遅延: '0ms (即座開始)',
        //   要素取得成功: true,
        //   要素のクラス: itemElement.className,
        //   要素のdata属性: {
        //     'data-task-id': itemElement.getAttribute('data-task-id'),
        //     'data-memo-id': itemElement.getAttribute('data-memo-id')
        //   },
        //   要素のtagName: itemElement.tagName,
        //   要素のid: itemElement.id,
        //   親要素: itemElement.parentElement?.tagName,
        //   CSSアニメーションクラス追加前: itemElement.classList.toString()
        // });
        
        // console.log('🎬 CSSアニメーションクラス追加:', { id, クラス名: 'bulk-fade-out-animation' });
        
        // フェードアウトアニメーション開始
        itemElement.classList.add('bulk-fade-out-animation');
        
        // console.log('✨ CSSアニメーションクラス追加後:', {
        //   id,
        //   クラス一覧: itemElement.classList.toString(),
        //   アニメーションクラス有無: itemElement.classList.contains('bulk-fade-out-animation'),
        //   computedスタイル: window.getComputedStyle(itemElement).animation
        // });
        
        // アニメーション完了時の処理（空間維持・透明のみ）
        setTimeout(() => {
          // アニメーションクラスを削除して透明にするだけ
          itemElement.classList.remove('bulk-fade-out-animation');
          itemElement.style.opacity = '0';
          itemElement.style.pointerEvents = 'none'; // クリック無効化
          // console.log(`👻 アニメーション完了処理（空間維持・透明のみ）:`, { id });
          
          // カウントアップ
          completedCount++;
          // console.log(`✅ ${actionType === 'delete' ? '削除' : '復元'}処理完了:`, { id, completedCount, totalItems });
          
          // 全てのアイテムが完了したらコールバック実行
          if (completedCount === totalItems) {
            // console.log(`🎊 実際のアニメーション完了時刻:`, Date.now(), { completedCount, totalItems });
            // ゴミ箱の蓋を閉じる（削除の場合のみ）
            if (actionType === 'delete' && trashLid) {
              trashLid.classList.remove('open');
            }
            onComplete?.();
          }
        }, bulkAnimationDuration); // アニメーション開始から300ms後に完了
      } else {
        // 復元時は要素が既に削除されている可能性があるため、エラーではなく警告レベルに
        if (actionType === 'restore') {
          console.warn(`⚠️ 復元対象の要素が既に削除されています:`, {
            id,
            index,
            セレクター: `[data-memo-id="${id}"], [data-task-id="${id}"]`,
            注記: '復元処理により既にDOMから削除された可能性があります'
          });
          
          // カウントアップ
          completedCount++;
          // console.log(`✅ ${actionType === 'delete' ? '削除' : '復元'}処理完了(要素なし):`, { id, completedCount, totalItems });
          
          // 全てのアイテムが完了したらコールバック実行
          if (completedCount === totalItems) {
            // console.log(`🎊 実際のアニメーション完了時刻(要素なし):`, Date.now(), { completedCount, totalItems });
            // 復元の場合はゴミ箱の蓋を閉じる処理は不要
            onComplete?.();
          }
        } else {
          console.warn(`⚠️ 要素が見つかりません - 処理をキャンセルします:`, {
            id,
            index,
            セレクター: `[data-memo-id="${id}"], [data-task-id="${id}"]`,
            actionType,
            注記: 'タブ切り替えやページ移動により処理が中断されました'
          });
          
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