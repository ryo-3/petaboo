# Claude開発仕様書

日本語で対応して　

## 技術スタック

- **フロントエンド**: Next.js + TypeScript + Tailwind CSS
- **バックエンド**: Hono + SQLite + Drizzle ORM
- **認証**: Clerk (JWT Bearer認証)
- **アーキテクチャ**: Turborepo monorepo構成

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
- `CategorySelector` - カテゴリー選択
- `SaveButton` - 保存ボタン統一（変更検知対応）
- `DeleteButton` - 削除ボタン統一（TrashIcon CSS化）
- `RightPanel` - 右パネル統一

## 開発コマンド

```bash
npm run check-types && npm run lint  # コミット前必須
git commit --no-verify               # WSL環境でpre-commitフックをスキップ
```

# 🚨 絶対禁止事項

## パッケージ関連

- ❌ **npmパッケージの追加・インストール**
- ❌ **package.jsonの変更**
- ❌ **依存関係の変更**

## 開発環境

- ❌ **`npm run dev`の実行** (WSL環境で問題発生)

## 作業方法

- ❌ **コードを読まずに修正提案**
- ❌ **変数・関数の存在確認をしない**
- ❌ **型エラー・lintエラーを残す**
- ❌ **`as unknown as`等の危険な型キャスト**
- ❌ **共通型を使わずにstring/numberを直接記述**

トランザクション処理　メモ一覧から削除するときに　削除済にコピーができていていないと削除を実行できない
どっちも成功したらどっちも処理する。
