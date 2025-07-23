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

## 主要システム

### カテゴリーシステム
- **API**: `/categories` (CRUD操作、Clerk Bearer認証)
- **フック**: `use-categories.ts` (React Query)
- **UI**: `CategorySelector` (CustomSelector利用)

### メモシステム
- **API**: `/memos` (CRUD操作、Clerk Bearer認証)
- **フック**: `use-memos.ts` (React Query)
- **テーブル**: `memos`, `deleted_memos`
- **originalId システム**: `${id}_${timestamp}_${random}` 形式で削除・復元時の一意性保証

### ボードシステム
- **API**: `/boards` `/boards/{id}/items`
- **フック**: `useBoards()` `useBoardWithItems(id)`
- **URL設計**: `/boards/{slug}` (SEOフレンドリー)
- **Slug生成**: 英数字=ケバブケース、日本語=ランダム6文字

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