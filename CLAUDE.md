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

### 実装パターン例
```tsx
// ❌ 特化コンポーネント
<DeleteButton />
<SaveButton />

// ✅ 共通化コンポーネント  
<ActionButton variant="danger" icon="trash" />
<ActionButton variant="primary" icon="save" />
```

### 共通化済みコンポーネント
- `BaseViewer` - viewer系コンポーネントの共通レイアウト
- `LoadingState`, `ErrorState`, `EmptyState` - 状態表示の統一
- `ConfirmationModal` - 確認ダイアログの統一
- `taskUtils.ts` - タスク関連ユーティリティ関数

## 開発制約・ルール
- 新しいnpmパッケージの追加は基本的に行わない
- 既存のライブラリ・フレームワークを最大限活用
- セキュリティを重視し、悪意のあるコード作成は禁止

## ディレクトリ構成
```
note/
├── apps/web/          # メインのWebアプリ
├── apps/api/          # バックエンドAPI  
├── packages/ui/       # 共通UIコンポーネント
└── CLAUDE.md         # 本ファイル
```

## 主要コンポーネント設計
- **apps/web/components/**: UIコンポーネント
  - `shared/`: 複数箇所で使用される共通コンポーネント
  - `ui/`: 基本的なUIパーツ
- **apps/web/src/**: ビジネスロジック
  - `hooks/`: カスタムフック
  - `utils/`: ユーティリティ関数

### 開発履歴
- 2025-06-30: 共通化ファーストアプローチ設計原則確立
- 2025-06-30: BaseViewer, LoadingState/ErrorState, ConfirmationModal共通化完了

npx tsc --noEmit