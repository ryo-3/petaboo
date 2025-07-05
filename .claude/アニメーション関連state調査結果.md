# アニメーション関連state調査結果

## 主要なアニメーション管理

### 1. 削除アニメーション（deleteAnimation.ts）
- **問題点**: JavaScriptで完全制御（553行の巨大ファイル）
- **主な機能**:
  - ゴミ箱の蓋開閉（`--lid-open`変数）
  - アイテムの飛ぶアニメーション
  - クローン要素作成
  - 複数アイテムの順次アニメーション
- **CSS化の可能性**: 高

### 2. 保存ボタンアニメーション（SaveButton）
```typescript
const [showSuccess, setShowSuccess] = useState(false);
// 保存成功時のチェックマークアニメーション
```
- **CSS化の可能性**: 高（CSS animationで実装可能）

### 3. 復元ボタンアニメーション（RestoreButton）
```typescript
const [isRotating, setIsRotating] = useState(false);
// 回転アニメーション
```
- **CSS化の可能性**: 高（CSS animationで実装可能）

### 4. モーダルアニメーション（ConfirmationModal）
```typescript
const [isClosing, setIsClosing] = useState(false);
// フェードアウトアニメーション
```
- **CSS化の可能性**: 高（CSS transitionで実装可能）

### 5. 右パネルスライド（RightPanel）
```typescript
const panelClasses = isOpen
  ? "translate-x-0 opacity-100"
  : "translate-x-full opacity-0";
```
- **現状**: 既にCSS（Tailwind）で実装済み ✅

### 6. セレクター開閉（CustomSelector）
```typescript
const [isOpen, setIsOpen] = useState(false);
// ドロップダウンの開閉
```
- **CSS化の可能性**: 中（:focus-withinなどで一部可能）

### 7. ソートメニュー（SortMenuButton）
```typescript
const [isOpen, setIsOpen] = useState(false);
// メニューの開閉
```
- **CSS化の可能性**: 中

## 優先順位

1. **deleteAnimation.ts** - 最も重い、効果大
2. **SaveButton** - シンプルで効果的
3. **RestoreButton** - シンプルで効果的
4. **ConfirmationModal** - モーダル全体の改善
5. **セレクター/メニュー** - インタラクティブ要素のため慎重に

## 推奨アプローチ
1. deleteAnimation.tsをCSS @keyframesに移行
2. 成功/エラー表示をCSS animationに
3. モーダルのフェードをCSS transitionに