# Claude開発メモ

## プロジェクト概要
- **メモ帳アプリ**: メモとタスクの統合管理アプリ
- **技術スタック**: Next.js + TypeScript + Tailwind CSS + SQLite
- **アーキテクチャ**: Turborepo monorepo構成

## 基本設計原則：共通化ファーストアプローチ

### 新規コンポーネント作成前の必須チェック
```
□ 既存の類似コンポーネントはないか？
□ 将来的に別の場所で使う可能性は？  
□ variant/size/color等のオプションは必要か？
□ カスタマイズポイントは適切に設計したか？
```

### 設計指針
- **2回以上使われる可能性があるなら即座に共通化**
- **Props設計は拡張性重視**（variant, size, color等のオプション）
- **カスタマイズ可能な部分を明確化**（children, customIcon, className等）
- **機能固有の部分は無理に統合しない**（型安全性と保守性を重視）

### 実装パターン例
```tsx
// ❌ 特化コンポーネント
<DeleteButton />
<SaveButton />

// ✅ 共通化コンポーネント  
<ActionButton variant="danger" icon="trash" />
<ActionButton variant="primary" icon="save" />

// ✅ 機能別コンポーネント（統合しない方が良い例）
<MemoCard memo={memo} />  // メモ特有の表示
<TaskCard task={task} />  // タスク特有の表示
```

## ディレクトリ構成（2025-07-01 リファクタリング完了）

```
apps/web/components/
├── features/              # 機能別コンポーネント
│   ├── memo/             # メモ関連
│   │   ├── memo-creator.tsx
│   │   ├── memo-editor.tsx
│   │   ├── memo-card.tsx
│   │   ├── memo-list-item.tsx
│   │   ├── memo-card-content.tsx
│   │   ├── deleted-memo-list.tsx
│   │   └── deleted-memo-viewer.tsx
│   └── task/             # タスク関連
│       ├── task-creator.tsx
│       ├── task-editor.tsx
│       ├── task-card.tsx
│       ├── task-list-item.tsx
│       ├── task-card-content.tsx
│       └── task-status-display.tsx
├── layout/               # レイアウト関連
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── desktop-list-view.tsx
├── mobile/               # モバイル専用
│   ├── memo-list.tsx
│   └── task-list.tsx
├── screens/              # 画面レベル
│   ├── welcome-screen.tsx
│   └── settings-screen.tsx
├── ui/                   # 再利用可能UIコンポーネント
│   ├── buttons/          # ボタン系
│   ├── layout/           # レイアウト系（base-card, item-grid等）
│   ├── feedback/         # フィードバック系（loading, error, empty等）
│   └── base/             # 基本系（modal, switch, tooltip等）
├── shared/               # 機能横断
│   ├── base-viewer.tsx
│   ├── date-info.tsx
│   └── sidebar-item.tsx
└── icons/                # アイコン集約
```

### ディレクトリ設計思想
- **features/**: memo/task等、機能別に分離。型安全性と保守性を重視
- **layout/**: ページ全体のレイアウト構成
- **mobile/**: モバイル専用UI（PC版と大きく異なる場合）
- **ui/**: 用途別サブディレクトリで再利用性を重視
- **shared/**: 複数機能で共有されるコンポーネント

## 共通化済みコンポーネント
- `BaseCard` - カード系コンポーネントの共通レイアウト
- `BaseViewer` - viewer系コンポーネントの共通レイアウト
- `LoadingState`, `ErrorState`, `EmptyState` - 状態表示の統一
- `ConfirmationModal` - 確認ダイアログの統一
- `SidebarItem` - サイドバーアイテムの統一
- `ItemGrid` - グリッドレイアウトの統一
- `taskUtils.ts` - タスク関連ユーティリティ関数

## 統合しないコンポーネント（意図的分離）
- `MemoCard` vs `TaskCard` - 表示内容が根本的に異なる
- `MemoCreator` vs `TaskCreator` - 入力フォームの構造が大きく異なる
- `MemoListItem` vs `TaskListItem` - 表示要素とロジックが異なる

## 開発制約・ルール
- 新しいnpmパッケージの追加は基本的に行わない
- 既存のライブラリ・フレームワークを最大限活用
- セキュリティを重視し、悪意のあるコード作成は禁止

## ビルド・型チェックコマンド
```bash
npx tsc --noEmit  # 型チェック
```

## 開発履歴
- 2025-06-30: 共通化ファーストアプローチ設計原則確立
- 2025-06-30: BaseViewer, LoadingState/ErrorState, ConfirmationModal共通化完了
- 2025-07-01: コンポーネントディレクトリ構造の大幅リファクタリング完了
  - features/memo/, features/task/で機能別分離
  - ui/配下をbuttons/layout/feedback/base/に細分化
  - mobile/フォルダー新設でモバイル専用コンポーネント分離
  - task-tab-content.tsx → task-status-display.tsxにリネーム（命名改善）