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

## ディレクトリ構成（2025-07-01 画面モード統一リファクタリング完了）

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
│   ├── desktop-layout.tsx       # サイドバー+メインレイアウト
│   ├── desktop-list-view.tsx    # 旧版（使用中、削除予定）
│   ├── desktop-upper.tsx        # 上部コントロール（タイトル・タブ・設定）
│   └── desktop-lower.tsx        # 下部アイテム一覧表示
├── mobile/               # モバイル専用
│   ├── memo-list.tsx
│   └── task-list.tsx
├── screens/              # 画面レベル（画面モード統一アーキテクチャ）
│   ├── welcome-screen.tsx       # home モード
│   ├── memo-screen.tsx          # memo モード
│   ├── task-screen.tsx          # task モード
│   ├── create-screen.tsx        # create モード（メモ・タスク統合作成）
│   └── settings-screen.tsx      # settings モード
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

## CLAUDE.md更新ルール
**以下のタイミングで必ずCLAUDE.mdを確認・更新する:**
- **ディレクトリ構造変更時**: 新フォルダー作成・移動、コンポーネント配置変更、ファイル名変更
- **設計方針変更時**: 共通化vs分離判断基準変更、新設計パターン導入、アーキテクチャ見直し
- **大きな機能追加時**: 新機能領域追加、共通コンポーネント追加、新開発ルール確立
- **重要な技術的判断時**: ライブラリ選択・変更、開発制約追加・変更、パフォーマンス対応

**更新内容**: ディレクトリ構成図、共通化済みコンポーネント一覧、設計指針・ルール、開発履歴

## ビルド・型チェックコマンド
```bash
npm run check-types  # 型チェック（正しいコマンド）
# ❌ npx tsc --noEmit は使わない！（Turborepo + Next.jsでは設定エラーになる）
```

## 画面モード統一アーキテクチャ（2025-07-01 完了）

### 新アーキテクチャ概要
従来の複雑な条件分岐から、5つのシンプルな画面モードに統一：

```tsx
type ScreenMode = 'home' | 'memo' | 'task' | 'create' | 'settings';
```

### 画面モード仕様
- **home**: ウェルカム画面（WelcomeScreen）
- **memo**: メモ関連画面（MemoScreen - 一覧・表示・編集）
- **task**: タスク関連画面（TaskScreen - 一覧・表示・編集）  
- **create**: 新規作成画面（CreateScreen - メモ・タスク統合作成）
- **settings**: 設定画面（SettingsScreen）

### 技術的改善
- **main.tsx**: 複雑な条件分岐から5つのシンプルな条件表示に変更
- **画面コンポーネント**: 各モード専用の Screen コンポーネントで責務分離
- **レイアウト再利用**: DesktopUpper/Lower を各画面で再利用
- **CreateScreen**: メモ・タスク作成をタブ切り替えで統合

## 開発履歴
- 2025-06-30: 共通化ファーストアプローチ設計原則確立
- 2025-06-30: BaseViewer, LoadingState/ErrorState, ConfirmationModal共通化完了
- 2025-07-01: コンポーネントディレクトリ構造の大幅リファクタリング完了
  - features/memo/, features/task/で機能別分離
  - ui/配下をbuttons/layout/feedback/base/に細分化
  - mobile/フォルダー新設でモバイル専用コンポーネント分離
  - task-tab-content.tsx → task-status-display.tsxにリネーム（命名改善）
- 2025-07-01: 削除ボタンの設計改善とタスク削除時エディター自動クローズ機能実装
  - BaseViewerから削除ボタンを独立したDeleteButtonコンポーネントに分離
  - タスクエディターで削除時に右向き矢印と同じ動作でエディターを閉じる機能追加
  - 型安全性確保（handleSelectTaskでTask | nullに対応）
- 2025-07-01: 画面モード統一アーキテクチャ実装完了
  - 5つの画面モード（home/memo/task/create/settings）に統一
  - DesktopLayout + DesktopUpper/Lower による再利用可能レイアウト設計
  - CreateScreen: メモ・タスク統合作成画面でUX向上
  - main.tsx の複雑な条件分岐を大幅簡素化

## 次回開発仕様書

### 優先度1: 型エラー修正とクリーンアップ
```bash
# 型エラー確認
npm run check-types

# 実際の型エラー箇所:
✅ main.tsx(195,19): handleEditMemo で setScreenMode('edit') → 'memo' に修正必要
✅ main.tsx(202,19): handleEditTask で setScreenMode('edit') → 'task' に修正必要
（新しいScreenModeでは'edit'が存在しない）

# その他チェック項目:
- DesktopUpper/Lower の props型不一致
- TaskScreen/MemoScreen での未使用props警告  
- CreateScreen の型定義確認
```

### 優先度2: 旧コード削除とファイル整理
- main.tsx の旧バージョンコメントアウト部分削除
- desktop-list-view.tsx の使用状況確認・削除検討
- 不要なimport文の整理

### 優先度3: 機能的な細かい修正
- 削除後のアイテム選択のずれ修正（標準日付並び順）
- 各画面でのローディング・エラー状態の統一
- タブ切り替え時の状態リセット動作確認

### 優先度4: UX改善
- CreateScreen のタブ切り替え時のフォーカス制御
- 画面遷移アニメーションの統一
- モバイル版での新アーキテクチャ対応検討

### 技術的課題
- 画面モード変更時の状態管理最適化
- メモリリークの可能性（useEffect cleanup）
- パフォーマンス改善（不要な再レンダリング防止）