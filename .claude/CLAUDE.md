# Claude開発仕様書

日本語で対応して　

## 技術スタック

- **フロントエンド**: Next.js 15.3.0 + TypeScript 5.8.2 + Tailwind CSS 3.4.0
- **バックエンド**: Hono 4.8.3 + SQLite + Drizzle ORM 0.44.2
- **認証**: Clerk 6.23.0 (JWT Bearer認証)
- **状態管理**: React Query 5.56.2
- **アーキテクチャ**: Turborepo 2.5.4 monorepo構成
- **パッケージ管理**: pnpm 9.0.0

## 基本設計原則

- **共通化ファースト**: 2回以上使われる可能性があるなら即座に共通化
- **Props設計**: variant, size, color等のオプションで拡張性重視
- **親からサイズ指定**: デフォルト値は定義せず、明示的にサイズを渡す
- **型安全性**: 共通型定義で一元管理、危険な型キャストは禁止

## 主要システム

### カテゴリーシステム

- **API**: `/categories` (CRUD操作、Clerk Bearer認証)
- **フック**: `use-categories.ts` (React Query)
- **UI**: `CategorySelector` (CustomSelector利用)

### ボードカテゴリーシステム

- **API**: `/board-categories` (ボード専用カテゴリー、CRUD操作)
- **テーブル**: `board_categories` (boardId, sortOrder対応)
- **フック**: `use-board-categories.ts` (React Query)
- **UI**: `BoardCategorySelector`, `BoardCategoryManager`
- **特徴**: ボード内でのカテゴリー管理、ソート順序対応

### メモシステム

- **API**: `/memos` (CRUD操作、Clerk Bearer認証)
- **フック**: `use-memos.ts` (React Query)
- **テーブル**: `memos`, `deleted_memos`
- **originalId システム**: `id.toString()` 形式でシンプルかつ安全な一意性保証

### ボードシステム

- **API**: `/boards` `/boards/{id}/items`
- **フック**: `useBoards()` `useBoardWithItems(id)`
- **URL設計**: `/boards/{slug}` (SEOフレンドリー)
- **Slug生成**: 英数字=ケバブケース、日本語=ランダム6文字
- **itemId**: `OriginalId`型でoriginalIdと統一

### タスクシステム

- **API**: `/tasks` (CRUD操作、Clerk Bearer認証)
- **フック**: `use-tasks.ts` (React Query)
- **テーブル**: `tasks`, `deleted_tasks`
- **originalId システム**: メモと同じ`id.toString()`形式

### データインポート機能

- **CSVインポート**: メモ、タスク、ボードアイテム対応
- **UI**: `csv-import-modal.tsx` (各機能別)
- **フォーマット**: CSV形式での一括データ取り込み

### バルク操作機能

- **一括削除**: メモ・タスクの複数選択削除
- **一括復元**: 削除済みアイテムの複数選択復元  
- **フック**: `use-memo-bulk-delete.tsx`, `use-task-bulk-delete.tsx`
- **UI**: 選択モード切り替え、一括操作ボタン

## 型システム

### 共通型定義 (`apps/web/src/types/common.ts`)

```typescript
/**
 * originalId型 - AUTO_INCREMENTのIDを文字列化したもの
 * 例: id=5 → originalId="5"
 * 用途: 削除・復元時の一意性追跡、ボードアイテムの識別
 */
export type OriginalId = string;
```

### originalId設計思想

- **生成方法**: `generateOriginalId(id) = id.toString()`
- **一意性**: AUTO_INCREMENTベースで100%保証
- **用途**: 削除・復元追跡、ボードアイテム識別
- **将来対応**: UUID拡張準備済み（基本は使わない）
- **型安全**: `OriginalId`型で統一、`as unknown as`禁止

### ID種別

- **id**: `number` - データベース主キー（AUTO_INCREMENT）
- **originalId**: `OriginalId` - 削除・復元追跡用（メイン識別子）
- **uuid**: `string` - 将来のエクスポート用（基本使わない）

## API認証パターン

```typescript
// Clerk Bearer認証（credentials: "include" 不要）
const response = await fetch(`${API_BASE_URL}/categories`, {
  headers: {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  },
});
```

## UI統一規則

- **フォーム高さ**: セレクター・インプット共に `h-8` で統一
- **タブ高さ**: すべてのタブは `h-7` (28px) で統一
- **タブ色**:
  - メモ通常: `bg-gray-200` (アクティブ) / `bg-gray-500` (アイコン)
  - タスク未着手: `bg-zinc-200` (アクティブ) / `bg-zinc-400` (アイコン)
  - タスク進行中: `bg-blue-100` (アクティブ) / `bg-Blue` (アイコン)
  - タスク完了: `bg-Green/20` (アクティブ) / `bg-Green` (アイコン)
  - 削除済み: `bg-red-100` (アクティブ) / `TrashIcon` (アイコン)

## 重要コンポーネント

- `CustomSelector` - セレクター統一
- `CategorySelector` - 通常カテゴリー選択
- `BoardCategorySelector` - ボードカテゴリー選択
- `BoardCategoryManager` - ボードカテゴリー管理（CRUD操作）
- `SaveButton` - 保存ボタン統一（変更検知対応）
- `DeleteButton` - 削除ボタン統一（TrashIcon CSS化）
- `RightPanel` - 右パネル統一
- `CsvImportModal` - CSVインポート統一（各機能別）
- `BulkActionButtons` - 一括操作ボタン

## 開発コマンド

```bash
# エラーチェック（開発中）
npm run check:quick                  # TypeScriptのみ高速チェック
npm run check:wsl                    # TypeScript + Lint（WSL最適化）
npm run check:full                   # 全パッケージ完全チェック

# 開発サーバー起動（ログ記録付き）
npm run dev                          # api.logとweb.logに記録（ユーザーが手動実行）

# ログ管理（ユーザーが手動実行）
npm run log:clear                    # 全ログクリア
npm run log:cleanup                  # サイズベースでログローテーション
npm run log:watch                    # api.logのリアルタイム監視
npm run log:watch:web                # web.logのリアルタイム監視（5秒間重複フィルター付き）
npm run log:errors                   # api.logのエラーログのみ表示

# データベースリセット（API側で実行）
cd apps/api && npm run db:reset      # ローカルデータベースを完全削除
```

### webログフィルタリング
- **場所**: `apps/web/public/console-logger.js`
- **機能**: ブラウザコンソールログの重複排除（5秒間同一メッセージ除外）
- **対象**: console.log/error/warn/info → web.logファイル
- **メモ**: undefinedフィールドはJSON.stringifyで自動省略される

### 自動品質管理システム
- **コミット時自動実行**: 
  1. ログファイル自動クリア
  2. TypeScript + Lintエラーチェック
  3. 変更ファイルの品質チェック（lint-staged）
- **エラー時**: コミットを自動停止し、修正箇所を表示
- **ログ管理**: api.log, web.logは.gitignore済み（ユーザーが手動でnpm run dev実行）

# 🚨 絶対禁止事項

## 作業方法

- ❌ **コードを読まずに修正提案**
- ❌ **変数・関数の存在確認をしない**
- ❌ **型エラー・lintエラーを残す**
- ❌ **`as unknown as`等の危険な型キャスト**
- ❌ **共通型を使わずにstring/numberを直接記述**

## UI・UX関連

- ❌ **標準HTMLのtitle属性の使用** (カスタムTooltipコンポーネントを使用すること)

## 修正履歴

### 2025-08-21: WSL環境での開発品質管理システム完成

**環境変更**:
- WSL環境への完全移行とHusky正常セットアップ
- 自動品質管理システム構築
- TypeScriptパスエイリアス修正（@/* → ./*)

**新機能**:
- ログ共有システム（api.log, web.log対応）
- コミット時自動品質チェック（TypeScript + Lint）
- ログ自動管理（クリア・ローテーション）
- エラー発生時のコミット自動停止

**開発効率化**:
- `npm run dev` 1コマンドでログ記録付き開発（ユーザーが手動実行）
- エラーチェックコマンド3段階（quick/wsl/full）
- pre-commitフックによる品質保証
- Claude Codeとのログリアルタイム共有

**技術アップデート**:
- Next.js 15.3.0, React 19.1.0, Clerk 6.23.0
- Hono 4.8.3, Drizzle ORM 0.44.2
- Turborepo 2.5.4, pnpm 9.0.0

### 2025-08-10: originalIdベース統一完了

**問題**: ボードアイテム管理でID型不整合（数値 ⇔ 文字列）によるキャッシュエラー

**修正内容**:
- 全システムで`originalId`（文字列）ベースに統一
- `parseInt()`等の危険な型変換を全面削除  
- `useItemBoards`, `useRemoveItemFromBoard`の引数型を統一
- 関連コンポーネント（task-editor, memo-filter-wrapper等）修正

**効果**:
- ✅ キャッシュキー不整合問題の完全解消
- ✅ 型安全性の大幅向上  
- ✅ API呼び出し時の型エラー防止

トランザクション処理　メモ一覧から削除するときに　削除済にコピーができていていないと削除を実行できない
どっちも成功したらどっちも処理する。
