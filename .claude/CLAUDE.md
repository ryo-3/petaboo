# Claude開発仕様書

**🇯🇵 必ず日本語で対応すること**

## プロジェクト概要

**「Note」- 個人・チーム向け統合メモ・タスク管理システム**

### 何を作っているか

- **メモ管理**: 思考の記録・整理
- **タスク管理**: TODO・進捗管理
- **ボード機能**: プロジェクト単位での組織化
- **チーム機能**: 共同作業環境（プレミアム機能）

### 基本思想

- **シンプル**: 複雑な機能より使いやすさを重視
- **共通化**: 重複コードを徹底的に排除
- **型安全**: TypeScriptで堅牢なシステム構築
- **自動化**: 品質管理・デプロイを可能な限り自動化

## 技術スタック

- **フロントエンド**: Next.js 15.3.0 + TypeScript 5.8.2 + Tailwind CSS 3.4.0
- **バックエンド**: Hono 4.8.3 + SQLite + Drizzle ORM 0.44.2
- **API仕様**: OpenAPI 3.0 + Zod (@hono/zod-openapi)
- **認証**: Clerk 6.23.0 (JWT Bearer認証)
- **状態管理**: React Query 5.56.2
- **アーキテクチャ**: Turborepo 2.5.4 monorepo構成
- **パッケージ管理**: pnpm 9.0.0

## 基本設計原則

- **共通化ファースト**: 2回以上使われる可能性があるなら即座に共通化
- **Props設計**: variant, size, color等のオプションで拡張性重視
- **親からサイズ指定**: デフォルト値は定義せず、明示的にサイズを渡す
- **型安全性**: 共通型定義で一元管理、危険な型キャストは禁止

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
- **型安全**: `OriginalId`型で統一、`as unknown as`禁止

### ID種別

- **id**: `number` - データベース主キー（AUTO_INCREMENT）
- **originalId**: `OriginalId` - 削除・復元追跡用（メイン識別子）

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
- **タイトル文字**:‘text-[22px]で統一

## 開発コマンド

```bash
# 個別開発
cd apps/web && npm run dev     # Web単体起動（ログ付き）
cd apps/api && npm run dev     # API単体起動（ログ付き）

# 品質チェック
npm run check:wsl              # TypeScript + Lint (Web)
npm run check:api              # TypeScript + Lint (API)
```

## 🚀 開発フロー

### 1. API開発

```bash
# 1-1. API実装（スキーマ・ルート作成）
# 1-2. データ確認（DBクエリが最効率）
wrangler d1 execute petaboo-db --local --command "SELECT id, title FROM memos LIMIT 3;"

# 1-3. API動作テスト
apitest "/categories"                                    # GET
apitest "/memos" "POST" '{"title": "テストメモ"}'        # POST
```

### 2. エラー対応

```bash
# 2-1. ログエラーチェック（"check log files for errors -web.log api.log" でも可）
tail -20 petaboo/api.log | grep -i "error\|warn"

# 2-2. API再起動（問題時）
pkill -f "tsx.*apps/api" && cd apps/api && npm run dev &
```

### 3. フロントエンド実装

```bash
# 3-1. TypeScript + Lintチェック
npm run check:wsl

# 3-2. リアルタイムエラー確認
tail -f petaboo/web.log | grep -i "error\|warn"
```

## 🛠️ 開発コマンド集

### APIテスト自動化関数

```bash
apitest() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="$3"
    local base_url="http://localhost:7594"

    echo "🧪 Testing: $method $base_url$endpoint"

    if [ -n "$data" ]; then
        curl -s -X "$method" "$base_url$endpoint" \
          -H "Authorization: Bearer ${API_TOKEN:-dummy}" \
          -H "Content-Type: application/json" \
          -d "$data" | jq
    else
        curl -s -X "$method" "$base_url$endpoint" \
          -H "Authorization: Bearer ${API_TOKEN:-dummy}" | jq
    fi
}
```

### データベース確認コマンド

```bash
# 各テーブルデータ確認
wrangler d1 execute petaboo-db --local --command "SELECT id, title, LEFT(content, 50) as preview FROM memos ORDER BY createdAt DESC LIMIT 5;"
wrangler d1 execute petaboo-db --local --command "SELECT id, title, status, priority FROM tasks ORDER BY createdAt DESC LIMIT 5;"
wrangler d1 execute petaboo-db --local --command "SELECT id, name FROM categories ORDER BY createdAt DESC;"

# テーブル構造確認
wrangler d1 execute petaboo-db --local --command ".schema memos"
wrangler d1 execute petaboo-db --local --command ".tables"
```

### トラブルシューティング

```bash
# サーバー停止
lsof -ti:7594 | xargs -r kill -9  # API停止
lsof -ti:7593 | xargs -r kill -9  # Web停止

# ログエラーチェック
tail -20 petaboo/api.log | grep -i "error\|warn\|fail" || echo "APIログ: エラーなし"
tail -20 petaboo/web.log | grep -i "error\|warn\|fail" || echo "Webログ: エラーなし"
```

## 🤖 Claude自動実行

### CLAUDE.md読み込み時

- ログ監視準備（api.log・web.log存在時のみ）

### Web側ファイル変更時

1. **TypeScript + Lintチェック**: `npm run check:wsl` 自動実行
2. **エラー時**: 詳細表示・ファイル箇所特定
3. **成功時**: 変更完了確認メッセージ

**重要**: Bashコマンドは**ユーザー許可不要で自動実行**（コミット除く）

### APIスキーマ変更時

1. `cd apps/api && npm run db:push` を提案
2. APIサーバー停止必要性を通知
3. ユーザー判断で実行

## 🚨 絶対禁止事項

### 作業方法

- ❌ **コードを読まずに修正提案**
- ❌ **変数・関数の存在確認をしない**
- ❌ **型エラー・lintエラーを残す**
- ❌ **`as unknown as`等の危険な型キャスト**
- ❌ **共通型を使わずにstring/numberを直接記述**

### Git操作

- ❌ **勝手にコミット実行** - `Run git add . and commit in Japanese .` の明確な指示があるときのみ

### UI・UX関連

- ❌ **標準HTMLのtitle属性の使用** (カスタムTooltipコンポーネントを使用すること)

### データベース・マイグレーション関連

**🚨 絶対禁止（実行厳禁）:**

- ❌ **`npm run db:reset:local`の実行** - 既存データが全て消失する
- ❌ **`npm run db:migration:prod`の自動実行** - 本番データベースを変更する危険性

**ユーザー確認が必要（提案のみ）:**

- ⚠️ **`npm run db:generate`の実行** - スキーマ変更時は提案して確認を求める
- ⚠️ **`npm run db:migration:local`の実行** - ローカルDB変更時は提案して確認を求める
- ⚠️ **drizzle-kitコマンドの実行** - 必要時は提案して確認を求める

**作業OK（慎重に実行）:**

- ✅ **データベーススキーマファイルの編集** - コード修正として実行可能
- ✅ **マイグレーションファイルの確認・読み取り** - 内容確認は問題なし

## 📊 ログエラー自動チェック

**使用方法**: `check log files for errors -web.log api.log` と入力すると自動でエラーチェック

```bash
# ログファイル存在確認
ls -la petaboo/*.log

# APIログエラーチェック
tail -20 petaboo/api.log | grep -i "error\|warn\|fail" || echo "APIログ: エラーなし"

# Webログエラーチェック
tail -20 petaboo/web.log | grep -i "error\|warn\|fail" || echo "Webログ: エラーなし"
```
