# UI用語集

**最終更新日**: 2025-11-12

このドキュメントでは、ぺたぼーのUI開発で使用される重要な用語を定義します。

---

## ヘッダーコントロールパネル

### 概要

**ヘッダーコントロールパネル**は、画面上部のヘッダー領域に浮かんで表示されるコントロールパネルです。

### コンポーネント情報

- **コンポーネント名**: `HeaderControlPanel`
- **ファイルパス**: `apps/web/components/ui/controls/header-control-panel.tsx`
- **インターフェース**: `HeaderControlPanelProps`

### 技術的詳細

#### 配置方法

```tsx
// DesktopUpper内で使用
<HeaderControlPanel
  currentMode="memo"
  floatControls={true} // ← ヘッダー位置に浮かせる
  // ... その他のprops
/>
```

#### CSS実装

- `position: fixed` で固定位置配置
- `left` と `top` のスタイルで座標計算
- `z-index: 20` でヘッダーの上に重なる
- 半透明背景: `bg-white/95 backdrop-blur-sm`
- 角丸: `rounded-lg`
- 高さ固定: `h-7`

#### 位置管理

3つの位置に移動可能：

1. **左** (`left: 220px`)
2. **中央** (`left: windowWidth / 2 - controlWidth / 2`)
3. **右** (`left: windowWidth - controlWidth - 128`)

位置はlocalStorageに保存（キー: `control-panel-position`）

### 含まれる機能

1. **カラム数変更** (`ColumnCountSelector`)
   - 1〜4カラムの切り替え
   - モード別に保存（memo/task/board）

2. **選択モード切り替え** (`SelectionModeToggle`)
   - selectモード: 単一選択
   - checkモード: 複数選択（チェックボックス）

3. **ボードレイアウト切り替え** (`BoardLayoutToggle`)
   - horizontal: 横並び
   - vertical: 縦並び
   - 個人モードのみ表示

4. **パネル切り替え** (`ContentFilter`)
   - 3パネル（一覧・詳細・コメント）の表示/非表示切り替え
   - ボード詳細画面とメモ選択時に表示

5. **ソート** (`SortToggle`)
   - 複数ソート条件の設定
   - 昇順/降順切り替え

6. **フィルター** (`UnifiedFilterButton`)
   - タグフィルター
   - ボードフィルター
   - include/exclude切り替え

7. **CSV インポート/エクスポート**
   - CSVインポートボタン
   - ボードエクスポートボタン

### 使用箇所

- `DesktopUpper` コンポーネント内で使用
- メモ画面、タスク画面、ボード画面の全てで共通使用
- `floatControls={true}` でヘッダー位置に表示
- `floatControls={false}` で通常の位置に表示

### 関連コンポーネント

- **DesktopUpper**: ヘッダーコントロールパネルを含む上部レイアウト
- **DesktopLower**: 下部のコンテンツ表示エリア
- **ContentFilter**: パネル切り替えボタン群
- **ColumnCountSelector**: カラム数選択ボタン群
- **SelectionModeToggle**: 選択モード切り替えボタン

---

## その他のUI用語

### パネル

ぺたぼーでは、画面を複数の領域に分割する際に「パネル」という用語を使用します。

- **左パネル**: 一覧表示エリア
- **中央パネル**: 詳細表示・編集エリア
- **右パネル**: コメント・添付ファイル表示エリア

### コントロールパネルレイアウト

**コンポーネント**: `ControlPanelLayout` (`apps/web/components/layout/control-panel-layout.tsx`)

3パネルのリサイズ可能なレイアウトを提供するコンポーネント。

- ResizablePanel を使用
- パネルサイズをlocalStorageに保存
- visibility propsでパネルの表示/非表示を制御

---

## 命名規則

### ヘッダーコントロールパネル vs コントロールパネルレイアウト

- **ヘッダーコントロールパネル** (`HeaderControlPanel`): ヘッダー位置に浮かぶコントロール機能群
- **コントロールパネルレイアウト** (`ControlPanelLayout`): 3パネルのレイアウト管理

この2つは別物なので注意。

---

## 関連ドキュメント

- [構造マップ](../構造マップ.md) - プロジェクト全体構造
- [CLAUDE.md](../CLAUDE.md) - 開発ルール
