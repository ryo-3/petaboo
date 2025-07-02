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

## メモ機能アーキテクチャ（リファクタリング後）

### 保存ボタン方針への移行
- **従来**: 自動保存 + 複雑なID管理 + デバウンス
- **現在**: 手動保存ボタン + シンプル状態管理
- **目的**: IME入力問題とfocus問題の解決

### 現在のメモ管理システム
- **SimpleMemoEditor**: 新規作成・編集統一コンポーネント
- **useSimpleMemoSave**: 保存専用hook（auto-save除去）
- **空メモ削除**: 保存時に空の場合は削除 + 右パネル閉じる
- **連続新規作成**: 保存後に新しいエディターを再マウント

### ファイル構成
```
components/features/memo/
├── simple-memo-editor.tsx    # 統一メモエディター
├── memo-editor.tsx           # 旧エディター（複雑）
└── use-memo-bulk-delete.tsx

hooks/
├── use-simple-memo-save.ts   # 新しいシンプル保存hook
└── use-memo-form.ts         # 旧hook（複雑なID管理）
```

### 保存完了後の処理フロー
```tsx
const handleSaveComplete = (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => {
  if (wasEmpty) {
    // 空メモは削除して右パネル閉じる
    onDeselectAndStayOnMemoList?.();
    setMemoScreenMode("list");
  } else if (isNewMemo) {
    // 新規作成は連続作成のため再マウント（700ms遅延）
    onDeselectAndStayOnMemoList?.();
    setTimeout(() => {
      setCreateEditorKey(prev => prev + 1);
      setMemoScreenMode("create");
    }, 700);
  } else {
    // 既存メモ更新は選択状態更新
    onSelectMemo(savedMemo);
  }
};
```

### フォーカス管理
- **新規作成時**: 300ms遅延でtextareaにフォーカス
- **レイアウト崩れ対策**: autoFocus属性を除去、useEffectで管理
- **保存中表示**: 600ms間保存中を表示してUX向上

## 開発制約・ルール
- 新しいnpmパッケージの追加は基本的に行わない
- セキュリティを重視し、悪意のあるコード作成は禁止
- 型エラー・lintエラー0での開発を徹底