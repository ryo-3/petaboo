# 削除アニメーションCSS化 計画書

## 現状分析

### 現在の削除アニメーション関連state一覧

#### memo-screen.tsx
- `isLeftDeleting` - 左側一括削除中
- `isLeftLidOpen` - 左側ゴミ箱の蓋開閉
- `isRightDeleting` - 右側エディター削除中  
- `isRightLidOpen` - 右側ゴミ箱の蓋開閉

#### task-screen.tsx
- `isDeleting` - 削除中フラグ
- `isLidOpen` - ゴミ箱の蓋開閉
- `isRightLidOpen` - 右側ゴミ箱の蓋開閉

#### その他のコンポーネント
- `DeleteButton`: `isAnimating` prop
- `TrashIcon`: `isOpen` prop + MutationObserver
- `use-right-editor-delete`: アニメーション制御ロジック

### 現在のアニメーションフロー
1. 削除ボタンクリック
2. state更新（`setIsDeleting(true)`）
3. ゴミ箱の蓋が開く（`setIsLidOpen(true)`）
4. 削除処理実行
5. 完了後に蓋を閉じる（`useDeletionLid`フック）

## CSS-onlyアニメーション設計案

### 基本方針
- JavaScriptのstate管理を最小限に
- CSS変数とクラス切り替えで制御
- アニメーション定義はすべてCSS側に

### 実装アプローチ
```css
/* 削除ボタンの基本状態 */
.delete-button {
  transition: all 0.3s ease;
}

/* 削除実行中のクラス */
.delete-button.deleting {
  /* アニメーション定義 */
}

/* ゴミ箱アイコンのアニメーション */
.trash-icon {
  /* 蓋の部分 */
  .lid {
    transform-origin: 75% 50%;
    transition: transform 0.3s ease-out;
  }
}

.trash-icon.open .lid {
  transform: rotate(42deg) translateX(5px) translateY(-2px);
}

/* 削除アニメーションシーケンス */
@keyframes deleteSequence {
  0% { /* 初期状態 */ }
  20% { /* ゴミ箱の蓋が開く */ }
  50% { /* アイテムが吸い込まれる */ }
  80% { /* ゴミ箱の蓋が閉じる */ }
  100% { /* 完了 */ }
}
```

## 移行計画

### Phase 1: TrashIconのCSS化（影響範囲：小）
- MutationObserver削除
- CSS classベースの制御に変更
- propsは`isOpen`のみ残す

### Phase 2: DeleteButtonのアニメーション簡素化（影響範囲：中）
- `isAnimating` propの処理をCSS化
- クラス切り替えのみで制御

### Phase 3: 削除フロー全体のstate削減（影響範囲：大）
- 複数のstateを統合
- 削除実行中の状態管理を簡素化
- アニメーションタイミングをCSSで制御

### Phase 4: 削除アニメーション統一（影響範囲：大）
- memo/task画面の削除アニメーション統一
- 共通のCSS定義に集約

## 期待効果
- **パフォーマンス向上**: JavaScript実行量削減
- **保守性向上**: アニメーション定義が一箇所に
- **コード削減**: state管理コードの大幅削減
- **レスポンス改善**: CSS TransitionはGPU最適化が効く

## リスク
- 既存の動作を完全に再現する必要がある
- 段階的移行中は新旧の実装が混在
- ブラウザ互換性の確認が必要