# Claude開発メモ

## プロジェクト概要
- **メモ帳アプリ**: メモとタスクの統合管理アプリ
- **技術スタック**: Next.js + TypeScript + Tailwind CSS + SQLite
- **アーキテクチャ**: Turborepo monorepo構成

## 基本設計原則：共通化ファーストアプローチ

### 設計指針
- **2回以上使われる可能性があるなら即座に共通化**
- **Props設計は拡張性重視**（variant, size, color等のオプション）
- **機能固有の部分は無理に統合しない**（型安全性と保守性を重視）

## ディレクトリ構成

```
apps/web/components/
├── features/              # 機能別（memo/, task/）
├── layout/               # レイアウト（desktop-upper.tsx, desktop-lower.tsx等）
├── screens/              # 画面レベル（memo-screen.tsx, task-screen.tsx等）
├── ui/                   # 再利用可能UI（buttons/, modals/, layout/等）
├── shared/               # 機能横断（base-viewer.tsx等）
└── icons/                # アイコン集約
```

## 重要な共通化コンポーネント
- `domUtils.ts` - DOM順序取得とアイテム選択の共通ユーティリティ
- `ConfirmationModal` - 確認ダイアログの統一（一括削除・単体削除対応）
- `BaseCard`, `BaseViewer` - レイアウト系の共通化
- `SaveButton` - メモ・タスク統一保存ボタン（変更検知対応）
- `PhotoButton` - 画像ボタンの統一コンポーネント
- `CustomSelector` - セレクター系UIの統一（ステータス・優先度等）
- `DateInput` - 日付入力の統一コンポーネント

## 開発コマンド

```bash
# 型チェック + Lint の一括実行（コミット前必須）
npm run check-types && npm run lint

# 型チェックのみ
npm run check-types

# Lintのみ
npm run lint
```

## 画面モード統一アーキテクチャ

```tsx
type ScreenMode = 'home' | 'memo' | 'task' | 'create' | 'settings';
```

5つのシンプルな画面モードでmain.tsxの複雑な条件分岐を解決。

## 削除後自動選択システム

DOM順序を直接取得してソート方法に依存しない自動選択を実装：

```tsx
import { getMemoDisplayOrder, getTaskDisplayOrder, getNextItemAfterDeletion } from "@/src/utils/domUtils";

const displayOrder = getTaskDisplayOrder();
const nextTask = getNextItemAfterDeletion(filteredTasks, deletedTask, displayOrder);
```

## メモ・タスク統一アーキテクチャ（2025-07-03更新）

### 変更検知システム実装
- **hasChanges**: 元データと現在データの比較による変更検知
- **保存ボタン制御**: 変更がない場合は自動でグレーアウト
- **保存後更新**: 成功時に初期値を更新して状態をリセット

### 統一保存システム
```tsx
// SaveButtonコンポーネント（統一）
<SaveButton
  onClick={handleSave}
  disabled={!hasChanges}  // 変更検知
  isSaving={isSaving}
/>

// 変更検知（useMemoForm/useSimpleMemoSave）
const hasChanges = useMemo(() => {
  return currentTitle !== initialTitle || currentContent !== initialContent;
}, [title, content, initialTitle, initialContent]);
```

### タスクエディター改善アーキテクチャ
- **常時編集可能**: editingFieldの削除でクリック不要に
- **カテゴリー管理**: 仕事・個人・勉強・健康・趣味の分類
- **4列グリッド**: ステータス・優先度・カテゴリー・期限日の統一レイアウト
- **高さ統一**: CustomSelector/DateInputで入力フィールドの高さを統一

### 現在のメモ管理システム
- **SimpleMemoEditor**: 新規作成・編集統一コンポーネント（変更検知対応）
- **useSimpleMemoSave**: 保存専用hook（変更検知機能追加）
- **空メモ削除**: 保存時に空の場合は削除 + 右パネル閉じる
- **連続新規作成**: 保存後に新しいエディターを再マウント

### ファイル構成
```
components/features/memo/
├── simple-memo-editor.tsx    # 統一メモエディター（変更検知対応）
├── memo-editor.tsx           # 既存エディター（変更検知対応）
└── use-memo-bulk-delete.tsx

components/features/task/
├── task-editor.tsx           # 常時編集対応・カテゴリー追加
├── task-creator.tsx          # PhotoButton統一
└── task-status-display.tsx

components/ui/
├── buttons/
│   ├── save-button.tsx       # 統一保存ボタン
│   └── photo-button.tsx      # 統一画像ボタン
├── selectors/
│   └── custom-selector.tsx   # 統一セレクターUI
└── inputs/
    └── date-input.tsx        # 統一日付入力

hooks/
├── use-simple-memo-save.ts   # 変更検知機能追加
└── use-memo-form.ts         # 変更検知機能追加
```

### フォーカス管理
- **新規作成時**: 300ms遅延でtextareaにフォーカス
- **レイアウト崩れ対策**: autoFocus属性を除去、useEffectで管理
- **保存中表示**: 600ms間保存中を表示してUX向上

## 開発制約・ルール
- 新しいnpmパッケージの追加は基本的に行わない
- セキュリティを重視し、悪意のあるコード作成は禁止
- 型エラー・lintエラー0での開発を徹底