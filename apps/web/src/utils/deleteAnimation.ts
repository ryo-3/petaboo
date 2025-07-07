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

// CSS版エディター削除アニメーション（Phase 1）- シンプル版
// ※重要: アニメーション時間はglobals.cssの:root --editor-animation-durationから自動取得します
export function animateEditorContentToTrashCSS(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  // CSS変数からアニメーション時間を取得（自動同期）
  const editorAnimationDuration = getAnimationDuration('editor');
  console.log('🎨 CSS版エディター削除アニメーション開始（シンプル版）');
  
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
  
  console.log('🎯 移動距離計算:', { 
    画面サイズ: { screenWidth, screenHeight },
    ゴミ箱位置: { trashX, trashY },
    開始位置中心: { x: editorRect.left + fixedWidth / 2, y: editorRect.top + fixedHeight / 2 },
    移動距離: { moveX, moveY }
  });
  
  // クローンをDOMに追加
  document.body.appendChild(clone);
  
  // CSSアニメーション開始
  clone.classList.add('editor-delete-animation');
  
  // アニメーション完了後の処理（CSS変数から自動取得した時間を使用）
  setTimeout(() => {
    document.body.removeChild(clone);
    console.log('🎨 CSS版エディター削除アニメーション完了');
    onComplete?.();
  }, editorAnimationDuration);
}

// 汎用CSS版フェードアウトアニメーション（即座DOM削除版）
// ※重要: アニメーション時間はglobals.cssの:root --bulk-animation-durationから自動取得します
export function animateBulkFadeOutCSS(
  itemIds: number[],
  onComplete?: () => void,
  delay: number = 120,
  actionType: 'delete' | 'restore' = 'delete',
  onItemComplete?: (id: number) => void
) {
  // CSS変数からアニメーション時間を取得（自動同期）
  const bulkAnimationDuration = getAnimationDuration('bulk');
  console.log(`🎨 CSS版${actionType === 'delete' ? '削除' : '復元'}アニメーション開始:`, { total: itemIds.length, itemIds });
  
  // DOM順序でアイテムをソートしてアニメーションの順序を正しくする
  // 実際DOMの順序でソート
  console.log('🔍 DOM順序取得開始:', { 対象IDs: itemIds });
  const allElements = document.querySelectorAll('[data-memo-id], [data-task-id]');
  console.log('🔍 DOM内の全要素:', { 要素数: allElements.length });
  
  const domOrder: number[] = [];
  allElements.forEach((el, index) => {
    const memoId = el.getAttribute('data-memo-id');
    const taskId = el.getAttribute('data-task-id');
    const id = memoId || taskId;
    const numId = id ? parseInt(id, 10) : null;
    
    console.log(`🔍 DOM要素${index}:`, {
      要素: el.tagName,
      class: el.className,
      memoId,
      taskId,
      解析されたID: numId,
      対象に含まれる: numId && itemIds.includes(numId)
    });
    
    if (numId && itemIds.includes(numId)) {
      domOrder.push(numId);
      console.log(`✅ DOM順序に追加:`, { ID: numId, 現在のDOM順序: [...domOrder] });
    }
  });
  
  console.log('🔍 DOM順序取得完了:', { DOM順序: domOrder, 取得数: domOrder.length });
  
  // 寶のitemIdsからDOM順序に基づいてソート
  const sortedItemIds = domOrder.filter(id => itemIds.includes(id));
  
  console.log(`🚨🚨🚨 重要: DOM順序でソート完了 🚨🚨🚨`, { 
    元の順序: itemIds,
    DOM順序: domOrder,
    ソート後: sortedItemIds,
    順序が変わった: JSON.stringify(itemIds) !== JSON.stringify(sortedItemIds),
    元の順序詳細: itemIds.map((id, i) => ({ 元index: i, id })),
    ソート後詳細: sortedItemIds.map((id, i) => ({ 新index: i, id }))
  });
  
  let completedCount = 0;
  const totalItems = sortedItemIds.length;
  
  // ゴミ箱の蓋を開く（削除の場合のみ）
  const trashLid = document.querySelector('.trash-icon-lid') as HTMLElement;
  if (actionType === 'delete' && trashLid) {
    trashLid.classList.add('open');
  }
  
  // DOM順序でソートされたアイテムに順次フェードアウトアニメーション適用
  sortedItemIds.forEach((id, index) => {
    setTimeout(() => {
      console.log(`🎯 ${actionType === 'delete' ? '削除' : '復元'}フェードアウトアニメーション開始:`, { id, index, delay: index * delay });
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      
      if (itemElement) {
        console.log(`🎯 CSS版${actionType === 'delete' ? '削除' : '復元'}フェードアウト:`, {
          id,
          index,
          遅延: '0ms (即座開始)',
          要素取得成功: true,
          要素のクラス: itemElement.className,
          要素のdata属性: {
            'data-task-id': itemElement.getAttribute('data-task-id'),
            'data-memo-id': itemElement.getAttribute('data-memo-id')
          },
          要素のtagName: itemElement.tagName,
          要素のid: itemElement.id,
          親要素: itemElement.parentElement?.tagName,
          CSSアニメーションクラス追加前: itemElement.classList.toString()
        });
        
        console.log('🎬 CSSアニメーションクラス追加:', { id, クラス名: 'bulk-fade-out-animation' });
        
        // フェードアウトアニメーション開始
        itemElement.classList.add('bulk-fade-out-animation');
        
        console.log('✨ CSSアニメーションクラス追加後:', {
          id,
          クラス一覧: itemElement.classList.toString(),
          アニメーションクラス有無: itemElement.classList.contains('bulk-fade-out-animation'),
          computedスタイル: window.getComputedStyle(itemElement).animation
        });
        
        // アニメーション完了時の処理
        setTimeout(() => {
          // アニメーションクラスを削除して要素を最小化
          itemElement.classList.remove('bulk-fade-out-animation');
          itemElement.style.height = '0';
          itemElement.style.overflow = 'hidden';
          itemElement.style.opacity = '0';
          itemElement.style.transform = 'scale(0.8)';
          itemElement.style.transition = 'all 0.1s ease-out';
          console.log(`👻 アニメーション完了処理:`, { id });
          
          // 少し遅らせてから完全に非表示
          setTimeout(() => {
            itemElement.style.visibility = 'hidden';
            itemElement.style.display = 'none';
            console.log(`👻 完全除外:`, { id });
          }, 100);
        }, bulkAnimationDuration + (index * delay)); // CSS変数から自動取得した時間を使用
        
        // その後DOM削除（State更新）を実行
        if (onItemComplete) {
          setTimeout(() => {
            onItemComplete(id);
            console.log(`🗑️ ${actionType === 'delete' ? '削除' : '復元'}DOM削除実行:`, { id });
          }, bulkAnimationDuration + 70 + (index * delay)); // CSSアニメーション完了後70ms遅らせる
        }
      } else {
        // 復元時は要素が既に削除されている可能性があるため、エラーではなく警告レベルに
        if (actionType === 'restore') {
          console.warn(`⚠️ 復元対象の要素が既に削除されています:`, {
            id,
            index,
            セレクター: `[data-memo-id="${id}"], [data-task-id="${id}"]`,
            注記: '復元処理により既にDOMから削除された可能性があります'
          });
          // 復元の場合はコールバックだけ実行
          if (onItemComplete) {
            onItemComplete(id);
          }
        } else {
          console.error(`❌ 要素が見つかりません:`, {
            id,
            index,
            セレクター: `[data-memo-id="${id}"], [data-task-id="${id}"]`,
            actionType,
            DOMに存在する全ての要素: Array.from(document.querySelectorAll('[data-memo-id], [data-task-id]')).map(el => ({
              type: el.getAttribute('data-memo-id') ? 'memo' : 'task',
              id: el.getAttribute('data-memo-id') || el.getAttribute('data-task-id'),
              element: el.tagName,
              class: el.className
            }))
          });
        }
      }
      
      // カウントアップ
      completedCount++;
      console.log(`✅ ${actionType === 'delete' ? '削除' : '復元'}処理完了:`, { id, completedCount, totalItems });
      
      // 全てのアイテムが完了したらコールバック実行
      if (completedCount === totalItems) {
        setTimeout(() => {
          console.log(`🎊 全${actionType === 'delete' ? '削除' : '復元'}アニメーション完了!`, { completedCount, totalItems });
          // ゴミ箱の蓋を閉じる（削除の場合のみ）
          if (actionType === 'delete' && trashLid) {
            trashLid.classList.remove('open');
          }
          onComplete?.();
        }, 100);
      }
    }, index * delay);
  });
}