# Phase 3: 削除フロー全体のstate削減 - 詳細計画

## 現在のstate構造

### memo-screen.tsx
```typescript
// 左側一括削除の状態
const [isLeftDeleting, setIsLeftDeleting] = useState(false);
const [isLeftLidOpen, setIsLeftLidOpen] = useState(false);

// 右側削除の状態  
const [isRightDeleting, setIsRightDeleting] = useState(false);
const [isRightLidOpen, setIsRightLidOpen] = useState(false);

// 削除完了時に蓋を閉じる処理
useDeletionLid(() => setIsRightLidOpen(false));
```

### task-screen.tsx
```typescript
// アニメーション状態
const [isDeleting, setIsDeleting] = useState(false);
// 蓋アニメーション状態
const [isLidOpen, setIsLidOpen] = useState(false);
const [isRightLidOpen, setIsRightLidOpen] = useState(false);

// 削除完了時に蓋を閉じる処理
useDeletionLid(() => setIsRightLidOpen(false));
```

## 問題点
1. 削除状態と蓋の開閉状態が分離している
2. 左右で別々のstate管理
3. memo/taskで異なる命名規則
4. useDeletionLidフックで別途制御

## 改善案

### 1. state統合案
```typescript
// 削除状態を1つのstateで管理
const [deletionState, setDeletionState] = useState<{
  left: boolean;
  right: boolean;
}>({ left: false, right: false });
```

### 2. CSS制御案
```css
/* 削除実行中は自動的に蓋が開く */
.delete-button.deleting .trash-icon-lid {
  transform: rotate(42deg) translateX(5px) translateY(-2px);
}

/* アニメーションシーケンス */
@keyframes deletion-sequence {
  0% { 
    /* 初期状態 */
  }
  20% { 
    /* ゴミ箱の蓋が開く */
  }
  80% { 
    /* ゴミ箱の蓋が閉じる */
  }
  100% { 
    /* 完了 */
  }
}

.delete-button.deleting {
  animation: deletion-sequence 1.5s ease-out;
}
```

### 3. 実装手順
1. 削除関連のstateを統合
2. isAnimatingの代わりにCSSクラス制御
3. useDeletionLidフックを削除（CSS animationで自動化）
4. memo/task画面で同じ構造に統一

## 期待効果
- stateの数が1/4に削減（8個→2個）
- 蓋の開閉タイミングがCSS制御で自動化
- コードの可読性向上

## リスク
- 削除処理のタイミング調整が必要
- アニメーション終了の検知方法変更
- 既存の削除フローへの影響