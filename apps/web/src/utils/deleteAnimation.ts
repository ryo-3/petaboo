// 仮想ゴミ箱要素作成ヘルパー
function createVirtualTrash(trashRect: DOMRect): HTMLElement {
  const virtualTrash = document.createElement('div');
  virtualTrash.style.position = 'fixed';
  virtualTrash.style.left = `${trashRect.left}px`;
  virtualTrash.style.top = `${trashRect.top}px`;
  virtualTrash.style.width = `${trashRect.width}px`;
  virtualTrash.style.height = `${trashRect.height}px`;
  document.body.appendChild(virtualTrash);
  return virtualTrash;
}

// 共通アニメーションベース関数
function createTrashAnimation(
  itemElement: HTMLElement,
  trashElement: HTMLElement,
  options: {
    duration: number; // ミリ秒
    fixedSize?: { width: number; height: number }; // 固定サイズ
    targetOffset: { x: number; y: number }; // ゴミ箱からのオフセット
    scale: { x: number; y: number }; // 最終スケール
    opacity: number; // 最終透明度
    rotation: () => number; // 回転角度（関数）
    transformOrigin: string; // 変形の基点
    timingFunction: string; // イージング関数
    onComplete?: () => void;
  }
) {
  const itemRect = itemElement.getBoundingClientRect();
  
  // ゴミ箱の位置を取得
  const targetElement = trashElement.offsetWidth > 0 && trashElement.offsetHeight > 0 
    ? trashElement 
    : trashElement.parentElement as HTMLElement;
  const trashRect = targetElement.getBoundingClientRect();
  
  // 蓋を開く
  const trashIcon = trashElement.querySelector('[data-trash-icon]') as HTMLElement;
  if (trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // アニメーション用クローン作成
  const clone = itemElement.cloneNode(true) as HTMLElement;
  const width = options.fixedSize?.width || itemRect.width;
  const height = options.fixedSize?.height || itemRect.height;
  
  clone.style.position = 'fixed';
  clone.style.top = `${itemRect.top}px`;
  clone.style.left = `${itemRect.left}px`;
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  clone.style.transition = `all ${options.duration}ms ${options.timingFunction}`;
  clone.style.transformOrigin = options.transformOrigin;
  
  // 元要素を非表示（ゴミ箱ボタンは除く）
  itemElement.style.visibility = 'hidden';
  itemElement.style.pointerEvents = 'none';
  
  // ゴミ箱ボタンは表示を維持
  const trashButton = itemElement.querySelector('[data-right-panel-trash]') as HTMLElement;
  if (trashButton) {
    trashButton.style.visibility = 'visible';
    trashButton.style.pointerEvents = 'auto';
  }
  
  document.body.appendChild(clone);
  
  // ターゲット位置計算
  const targetX = trashRect.left + trashRect.width / 2 - width / 2 + options.targetOffset.x;
  const targetY = trashRect.top + trashRect.height / 2 - height / 2 + options.targetOffset.y;
  
  console.log('🔧 JS版位置計算:', {
    trashRect: { left: trashRect.left, top: trashRect.top, width: trashRect.width, height: trashRect.height },
    fixedSize: { width, height },
    targetOffset: options.targetOffset,
    計算結果: { targetX, targetY },
    相対位置: { x: targetX - itemRect.left, y: targetY - itemRect.top }
  });
  
  requestAnimationFrame(() => {
    // アニメーション開始時に即座に少し縮小開始
    clone.style.transform = `scale(0.5)`;
    
    // 次のフレームで本格的なアニメーション実行
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${targetX - itemRect.left}px, ${targetY - itemRect.top}px) scaleX(${options.scale.x}) scaleY(${options.scale.y}) rotate(${options.rotation()}deg)`;
      clone.style.opacity = options.opacity.toString();
    });
    
    setTimeout(() => {
      document.body.removeChild(clone);
      if (trashIcon) {
        trashIcon.style.setProperty('--lid-open', '0');
      }
      options.onComplete?.();
    }, options.duration);
  });
}

// リストアイテム用削除アニメーション
export function animateItemToTrash(
  itemElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  createTrashAnimation(itemElement, trashElement, {
    duration: 600,
    targetOffset: { x: 0, y: 0 }, // ゴミ箱中央
    scale: { x: 0.1, y: 0.1 },
    opacity: 0.3,
    rotation: () => 15,
    transformOrigin: 'center',
    timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    onComplete
  });
}

// 位置情報を使用してアニメーション実行
export function animateMultipleItemsToTrashWithRect(
  itemIds: number[],
  trashRect: DOMRect,
  onComplete?: () => void,
  delay: number = 100,
  viewMode: 'list' | 'card' = 'list'
) {
  console.log('🎭 アニメーション関数開始:', { total: itemIds.length, itemIds });
  
  const maxAnimatedItems = 20; // アニメーションする最大数
  const animatedIds = itemIds.slice(0, maxAnimatedItems);
  const remainingIds = itemIds.slice(maxAnimatedItems);
  
  console.log('🎭 アニメーション分割:', { 
    animated: animatedIds.length, 
    remaining: remainingIds.length, 
    animatedIds, 
    remainingIds 
  });
  
  let completedCount = 0;
  const totalItems = itemIds.length;
  
  // アニメーション中はスクロールバーを非表示
  const listContainer = document.querySelector('.overflow-y-auto') as HTMLElement;
  if (listContainer) {
    listContainer.style.overflow = 'hidden';
    console.log('📏 スクロールバー非表示');
  }
  
  // ゴミ箱の蓋を開く
  const trashIcon = document.querySelector('[data-trash-icon]') as HTMLElement;
  if (trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // 残りのアイテムを一斉にフェードアウト（20個以降は遅延なし）
  if (remainingIds.length > 0) {
    console.log('📦 残りのアイテム一斉フェードアウト:', { count: remainingIds.length });
    
    // ゴミ箱アニメーション最後のアイテムの後に実行
    setTimeout(() => {
      remainingIds.forEach((id) => {
        const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
        
        if (itemElement) {
          // クローンを作成してフェードアウトアニメーション
          const itemRect = itemElement.getBoundingClientRect();
          const clone = itemElement.cloneNode(true) as HTMLElement;
          
          clone.style.position = 'fixed';
          clone.style.top = `${itemRect.top}px`;
          clone.style.left = `${itemRect.left}px`;
          clone.style.width = `${itemRect.width}px`;
          clone.style.height = `${itemRect.height}px`;
          clone.style.zIndex = '9998';
          clone.style.pointerEvents = 'none';
          clone.style.transition = 'all 0.3s ease-out';
          
          // 元のアイテムを即座に非表示
          itemElement.style.opacity = '0';
          itemElement.style.transform = 'scale(0.8)';
          itemElement.style.transition = 'all 0.1s ease-out';
          
          // クローンをDOMに追加
          document.body.appendChild(clone);
          
          // クローンをフェードアウト
          requestAnimationFrame(() => {
            clone.style.opacity = '0';
            clone.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
              document.body.removeChild(clone);
            }, 300);
          });
        }
      });
      
      // 一斉にカウントアップ
      completedCount += remainingIds.length;
      console.log('✅ 一斉フェードアウト完了:', { count: remainingIds.length, completedCount, totalItems });
      
      // 全てのアイテムが完了したらコールバック実行
      if (completedCount >= totalItems) {
        setTimeout(() => {
          console.log('🎊 全アニメーション完了!', { completedCount, totalItems });
          if (trashIcon) {
            trashIcon.style.setProperty('--lid-open', '0');
          }
          // スクロールバーを復元
          if (listContainer) {
            listContainer.style.overflow = '';
            console.log('📏 スクロールバー復元');
          }
          onComplete?.();
        }, 300); // フェードアウトのtransition時間を待つ
      }
    }, maxAnimatedItems * delay); // 最初の20個のアニメーション後に実行
  }
  
  // 最初の20個だけアニメーション
  animatedIds.forEach((id, index) => {
    setTimeout(() => {
      console.log('🗑️ ゴミ箱アニメーション開始:', { id, index, delay: index * delay });
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      if (itemElement) {
        console.log('🗑️ ゴミ箱アイテム発見:', { id, element: itemElement });
        
        // viewModeに応じてアニメーション実行
        if (viewMode === 'card') {
          const trashElement = createVirtualTrash(trashRect);
          animateCardToTrash(itemElement, trashElement, () => {
            document.body.removeChild(trashElement);
            handleAnimationComplete();
          });
        } else {
          animateItemToTrashWithRect(itemElement, trashRect, handleAnimationComplete);
        }
        
        function handleAnimationComplete() {
          completedCount++;
          console.log('🗑️ アニメーション完了:', { id, completedCount, totalItems, viewMode });
          if (completedCount === totalItems) {
            setTimeout(() => {
              if (trashIcon) {
                trashIcon.style.setProperty('--lid-open', '0');
              }
              if (listContainer) {
                listContainer.style.overflow = '';
                console.log('📏 スクロールバー復元');
              }
              onComplete?.();
            }, 200);
          }
        }
      } else {
        completedCount++;
        // 全てのアイテム（ゴミ箱アニメーション + フェードアウト）が完了したらコールバック実行
        if (completedCount === totalItems) {
          setTimeout(() => {
            if (trashIcon) {
              trashIcon.style.setProperty('--lid-open', '0');
            }
            onComplete?.();
          }, 200);
        }
      }
    }, index * delay);
  });
}

// 位置情報を使用してアニメーション実行
export function animateItemToTrashWithRect(
  itemElement: HTMLElement,
  trashRect: DOMRect,
  onComplete?: () => void
) {
  // アイテムの初期位置を取得
  const itemRect = itemElement.getBoundingClientRect();
  
  // アニメーション用のクローンを作成
  const clone = itemElement.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.top = `${itemRect.top}px`;
  clone.style.left = `${itemRect.left}px`;
  clone.style.width = `${itemRect.width}px`;
  clone.style.height = `${itemRect.height}px`;
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  clone.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  clone.style.transformOrigin = 'center';
  
  // 元のアイテムを非表示にする（高さは保持）
  itemElement.style.visibility = 'hidden';
  itemElement.style.pointerEvents = 'none';
  
  // クローンをDOMに追加
  document.body.appendChild(clone);
  
  // アニメーション開始
  requestAnimationFrame(() => {
    // ゴミ箱の口（左上寄り）に向かって移動・縮小
    const targetX = trashRect.left + trashRect.width / 2 - itemRect.width / 2 - 13; // ~px左へ
    const targetY = trashRect.top + trashRect.height * 0.2 - 34; // ~px上へ
    
    // より自然な弧を描く動きを作成
    clone.style.transform = `translate(${targetX - itemRect.left}px, ${targetY - itemRect.top}px) scale(0.05) rotate(${Math.random() * 15 + 5}deg)`;
    clone.style.opacity = '0.8';
    
    // 最初の段階で少し遅延
    setTimeout(() => {
      // ゴミ箱の中に落ちる動き
      clone.style.transform = `translate(${targetX - itemRect.left}px, ${targetY - itemRect.top + 20}px) scaleX(0.001) scaleY(0.01) rotate(${Math.random() * 30 + 10}deg)`;
      clone.style.opacity = '0';
      clone.style.transition = 'all 0.5s ease-in';
    }, 600);
    
    // アニメーション完了後の処理
    setTimeout(() => {
      document.body.removeChild(clone);
      onComplete?.();
    }, 600);
  });
}

// 複数アイテムを順次ゴミ箱に飛ばす
export function animateMultipleItemsToTrash(
  itemIds: number[],
  trashElement: HTMLElement,
  onComplete?: () => void,
  delay: number = 100,
  viewMode: 'list' | 'card' = 'list'
) {
  let completedCount = 0;
  
  itemIds.forEach((id, index) => {
    setTimeout(() => {
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      if (itemElement) {
        // カード表示の時はanimateCardToTrash、リスト表示の時はanimateItemToTrashを使用
        const animateFunction = viewMode === 'card' ? animateCardToTrash : animateItemToTrash;
        animateFunction(itemElement, trashElement, () => {
          completedCount++;
          if (completedCount === itemIds.length) {
            onComplete?.();
          }
        });
      } else {
        completedCount++;
        if (completedCount === itemIds.length) {
          onComplete?.();
        }
      }
    }, index * delay);
  });
}

// エディター全体をゴミ箱に吸い込むアニメーション
export function animateEditorToTrash(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  console.log('📝 エディターゴミ箱アニメーション開始');
  
  // エディターの位置とサイズを取得
  const editorRect = editorElement.getBoundingClientRect();
  const trashRect = trashElement.getBoundingClientRect();
  
  // 蓋を開く
  const trashIcon = trashElement.querySelector('[data-trash-icon]') as HTMLElement;
  if (trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // エディター全体のアニメーション設定
  editorElement.style.position = 'fixed';
  editorElement.style.top = `${editorRect.top}px`;
  editorElement.style.left = `${editorRect.left}px`;
  editorElement.style.width = `${editorRect.width}px`;
  editorElement.style.height = `${editorRect.height}px`;
  editorElement.style.zIndex = '9999';
  editorElement.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  editorElement.style.transformOrigin = 'center';
  
  // ゴミ箱の口（左上寄り）に向かって移動・縮小
  const targetX = trashRect.left + trashRect.width / 2 - editorRect.width / 2 - 13;
  const targetY = trashRect.top + trashRect.height * 0.2 - 34;
  
  // アニメーション開始
  requestAnimationFrame(() => {
    editorElement.style.transform = `translate(${targetX - editorRect.left}px, ${targetY - editorRect.top}px) scale(0.02) rotate(${Math.random() * 20 + 10}deg)`;
    editorElement.style.opacity = '0.8';
    
    // アニメーション完了後の処理
    setTimeout(() => {
      console.log('📝 エディターゴミ箱アニメーション完了');
      
      // 蓋を閉じる
      if (trashIcon) {
        trashIcon.style.setProperty('--lid-open', '0');
      }
      
      onComplete?.();
    }, 800);
  });
}

// カード用削除アニメーション（中央から縮小）
export function animateCardToTrash(
  cardElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  console.log('📄 カードゴミ箱アニメーション開始');
  
  createTrashAnimation(cardElement, trashElement, {
    duration: 700, // カードは少しゆっくり
    targetOffset: { x: -30, y: -15 }, // カードは大きいので少し上に
    scale: { x: 0.02, y: 0.02 }, // カードはより小さく
    opacity: 0.3,
    rotation: () => Math.random() * 20 + 10, // 少し回転
    transformOrigin: 'center',
    timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    onComplete
  });
}


// エディター用削除アニメーション（ゴミ箱に吸い込まれる）
// TODO: CSS版に移行完了後に削除予定
export function animateEditorContentToTrash(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  console.log('✏️ エディターコンテンツゴミ箱アニメーション開始');
  
  createTrashAnimation(editorElement, trashElement, {
    duration: 800,
    fixedSize: { width: 400, height: 200 }, // 固定サイズ
    targetOffset: { x: -10, y: -30 }, // 中央寄り上
    scale: { x: 0.01, y: 0.01 }, // 均等に縮む
    opacity: 0.3,
    rotation: () => 0, // 回転なし
    transformOrigin: 'center',
    timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    onComplete
  });
}

// CSS版の削除アニメーション（Phase 1）
export function animateItemToTrashCSS(
  itemElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  // ターゲット位置計算（簡略化）
  const itemRect = itemElement.getBoundingClientRect();
  const trashRect = trashElement.getBoundingClientRect();
  
  const targetX = trashRect.left + trashRect.width / 2 - itemRect.left - itemRect.width / 2;
  const targetY = trashRect.top + trashRect.height / 2 - itemRect.top - itemRect.height / 2;
  
  // CSS変数でターゲット位置を設定
  itemElement.style.setProperty('--target-x', `${targetX}px`);
  itemElement.style.setProperty('--target-y', `${targetY}px`);
  
  // CSSアニメーション開始
  itemElement.classList.add('item-delete-animation');
  
  // アニメーション完了後の処理
  setTimeout(() => {
    onComplete?.();
  }, 600); // CSSのanimation-durationと同じ
}

// CSS版のフェードアウト（Phase 1）
export function animateItemFadeOutCSS(
  itemElement: HTMLElement,
  onComplete?: () => void
) {
  itemElement.classList.add('item-fade-out');
  
  setTimeout(() => {
    onComplete?.();
  }, 300);
}

// CSS版エディター削除アニメーション（Phase 1）- シンプル版
export function animateEditorContentToTrashCSS(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
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
  
  // アニメーション完了後の処理
  setTimeout(() => {
    document.body.removeChild(clone);
    console.log('🎨 CSS版エディター削除アニメーション完了');
    onComplete?.();
  }, 1000);
}

// 汎用CSS版フェードアウトアニメーション（即座DOM削除版）
export function animateBulkFadeOutCSS(
  itemIds: number[],
  onComplete?: () => void,
  delay: number = 120,
  actionType: 'delete' | 'restore' = 'delete',
  onItemComplete?: (id: number) => void
) {
  console.log(`🎨 CSS版${actionType === 'delete' ? '削除' : '復元'}アニメーション開始:`, { total: itemIds.length, itemIds });
  
  let completedCount = 0;
  const totalItems = itemIds.length;
  
  // ゴミ箱の蓋を開く（削除の場合のみ）
  const trashIcon = document.querySelector('[data-trash-icon]') as HTMLElement;
  if (actionType === 'delete' && trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // 全てのアイテムに順次フェードアウトアニメーション適用
  itemIds.forEach((id, index) => {
    setTimeout(() => {
      console.log(`🎯 ${actionType === 'delete' ? '削除' : '復元'}フェードアウトアニメーション開始:`, { id, index, delay: index * delay });
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      
      if (itemElement) {
        console.log(`🎯 CSS版${actionType === 'delete' ? '削除' : '復元'}フェードアウト:`, {
          id,
          index,
          遅延: '0ms (即座開始)'
        });
        
        // フェードアウトアニメーション開始
        itemElement.classList.add('bulk-fade-out-animation');
        
        // アニメーション完了時に高さを0にして非表示
        setTimeout(() => {
          itemElement.style.height = '0';
          itemElement.style.overflow = 'hidden';
          itemElement.style.visibility = 'hidden';
          console.log(`👻 高さ0設定:`, { id });
          
          // その後display: noneで完全に除外
          setTimeout(() => {
            itemElement.style.display = 'none';
            console.log(`👻 完全除外:`, { id });
          }, 10);
        }, 350 + (index * delay)); // アニメーション完了から50ms後
        
        // その後DOM削除（State更新）を実行
        if (onItemComplete) {
          setTimeout(() => {
            onItemComplete(id);
            console.log(`🗑️ ${actionType === 'delete' ? '削除' : '復元'}DOM削除実行:`, { id });
          }, 300 + (index * delay)); // アニメーション完了と同時
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
          if (actionType === 'delete' && trashIcon) {
            trashIcon.style.setProperty('--lid-open', '0');
          }
          onComplete?.();
        }, 100);
      }
    }, index * delay);
  });
}

// 復元用ラッパー関数
export function animateItemsRestoreFadeOutCSS(
  itemIds: number[],
  onComplete?: () => void,
  delay: number = 120
) {
  animateBulkFadeOutCSS(itemIds, onComplete, delay, 'restore');
}

// JS制御版シンプルフェードアウト（元のJS版トリック使用）
export function animateBulkFadeOutJS(
  itemIds: number[],
  onComplete?: () => void,
  delay: number = 120,
  actionType: 'delete' | 'restore' = 'delete'
) {
  console.log(`🎨 JS制御版${actionType === 'delete' ? '削除' : '復元'}アニメーション開始:`, { total: itemIds.length, itemIds });
  
  let completedCount = 0;
  const totalItems = itemIds.length;
  const clones: HTMLElement[] = [];
  
  // ゴミ箱の蓋を開く（削除の場合のみ）
  const trashIcon = document.querySelector('[data-trash-icon]') as HTMLElement;
  if (actionType === 'delete' && trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // 全てのアイテムに順次フェードアウトアニメーション適用
  itemIds.forEach((id, index) => {
    setTimeout(() => {
      console.log(`🎯 ${actionType === 'delete' ? '削除' : '復元'}フェードアウトアニメーション開始:`, { id, index, delay: index * delay });
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      
      if (itemElement) {
        // アニメーション用クローンを作成
        const itemRect = itemElement.getBoundingClientRect();
        const clone = itemElement.cloneNode(true) as HTMLElement;
        
        clone.style.position = 'fixed';
        clone.style.top = `${itemRect.top}px`;
        clone.style.left = `${itemRect.left}px`;
        clone.style.width = `${itemRect.width}px`;
        clone.style.height = `${itemRect.height}px`;
        clone.style.zIndex = '9999';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'all 300ms ease-out';
        clone.style.visibility = 'visible';
        clone.style.opacity = '1';
        
        // クローンをDOMに追加
        document.body.appendChild(clone);
        clones.push(clone);
        
        // クローンが表示されてから元要素を隠す
        requestAnimationFrame(() => {
          // 元要素を隠す（クローンが表示された後）
          itemElement.style.visibility = 'hidden';
          itemElement.style.pointerEvents = 'none';
          
          // 次のフレームでフェードアウトアニメーション開始
          requestAnimationFrame(() => {
            clone.style.opacity = '0';
            clone.style.transform = 'scale(0.8)';
            
            // アニメーション完了後の処理
            setTimeout(() => {
              // 完了カウント
            completedCount++;
            console.log(`✅ ${actionType === 'delete' ? '削除' : '復元'}処理完了:`, { id, completedCount, totalItems });
            
            // 全てのアイテムが完了したらまとめて処理
            if (completedCount === totalItems) {
              console.log(`🎊 全${actionType === 'delete' ? '削除' : '復元'}アニメーション完了!`, { completedCount, totalItems });
              
              // 全てのクローンを削除
              clones.forEach(clone => {
                if (clone.parentNode) {
                  document.body.removeChild(clone);
                }
              });
              
              // ゴミ箱の蓋を閉じる（削除の場合のみ）
              if (actionType === 'delete' && trashIcon) {
                trashIcon.style.setProperty('--lid-open', '0');
              }
              
              // 最後に一気にDOM操作（コールバック実行）
              onComplete?.();
            }
            }, 300); // フェードアウト完了まで待つ
          });
        });
      } else {
        // 要素が見つからない場合もカウント
        completedCount++;
        if (completedCount === totalItems) {
          // 全てのクローンを削除
          clones.forEach(clone => {
            if (clone.parentNode) {
              document.body.removeChild(clone);
            }
          });
          
          if (actionType === 'delete' && trashIcon) {
            trashIcon.style.setProperty('--lid-open', '0');
          }
          onComplete?.();
        }
      }
    }, index * delay);
  });
}


// CSS版複数アイテム削除アニメーション（Phase 2）- シンプルフェードアウト版
export function animateMultipleItemsToTrashCSS(
  itemIds: number[],
  trashRect: DOMRect,
  onComplete?: () => void,
  delay: number = 120,
  viewMode: 'list' | 'card' = 'list'
) {
  // 汎用フェードアウト関数を呼び出し
  animateBulkFadeOutCSS(itemIds, onComplete, delay, 'delete');
}