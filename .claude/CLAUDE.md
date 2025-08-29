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

## 開発コマンド

```bash
# 個別開発
cd apps/web && npm run dev     # Web単体起動（ログ付き）
cd apps/api && npm run dev     # API単体起動（ログ付き）

# 品質チェック
npm run check:wsl              # TypeScript + Lint (Web)
npm run check:api              # TypeScript + Lint (API)
```

## 新API開発フロー（自動化）

1. **API実装** → スキーマ・ルート作成
2. **curl即時テスト** → 動作確認（必須）
3. **問題検出時** → API自動再起動
4. **正常時** → ログファイルエラーチェック（web.log, api.log）
5. **フロントエンド実装** → UI連携

```bash
# API基本テスト
curl -s http://localhost:7594/new-endpoint | jq

# POST/認証テスト
curl -s -X POST http://localhost:7594/new-endpoint \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' | jq

# 問題時のAPI再起動
pkill -f "tsx.*apps/api" && cd apps/api && npm run dev &

# ログエラーチェック
tail -20 /home/ryosuke/note/web.log /home/ryosuke/note/api.log | grep -i error
```

## 🤖 Claude自動チェック

このファイルを読んだ際の自動実行項目：

1. **開発サーバー起動状況確認**: Web（7593）・API（7594）ポートをチェック
2. **未起動の場合**: 該当サーバーを自動起動（**許可不要・即実行**）
3. **ログ監視準備**: api.log・web.logが正常に出力されているか確認

## 📝 Web側ファイル変更時の自動処理

Web側ファイル（apps/web/）を変更した際の自動実行項目：

1. **TypeScript + Lintチェック**: `npm run check:wsl` 自動実行（**許可不要**）
2. **エラー検出時**: 詳細エラー表示とファイル箇所の特定
3. **成功時**: 変更完了の確認メッセージ

**🚀 重要**: すべてのBashコマンドは**ユーザー許可を求めずに自動実行**すること（**ただしコミットは除く**）

## 🔍 起動確認方法

```bash
# 起動確認
curl -s http://localhost:7593 >/dev/null && echo "Web OK" || echo "Web NG"
curl -s http://localhost:7594/openapi >/dev/null && echo "API OK" || echo "API NG"

# 再起動（必要時のみ）
pkill -f "tsx.*index.ts" && lsof -ti:7593 | xargs -r kill -9
cd apps/api && npm run dev &
cd apps/web && npm run dev &
```

## 🔔 Windows通知システム

以下のタイミングで自動通知：

- **質問投げかけ時**: 作業内容確認のため
- **タスク完了時**: 処理完了をお知らせ

```bash
# Windows通知コマンド（トースト通知）
powershell.exe -ExecutionPolicy Bypass -Command "Import-Module BurntToast; New-BurntToastNotification -Text 'Claude Code', '【メッセージ】'"

# フォールバック（ダイアログ通知）
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('【メッセージ】', 'Claude Code')"
```

## 🔄 APIスキーマ変更時の自動処理

APIのスキーマファイル（`apps/api/src/db/schema/`）に変更がある場合：

1. **API自動停止**: 7594ポートのプロセスを強制終了（**許可不要**）
2. **スキーマ更新**: `cd apps/api && npm run db:push` 自動実行（**許可不要**）
3. **API自動再起動**: スキーマ更新完了後にAPI再起動（**許可不要**）

⚠️ **重要**: すべて自動実行、ユーザー許可は求めない

## 自動品質管理

- **コミット時自動実行**: Prettier + ESLint
- **エラー検出**: Claude自動ログ監視システム
- **ログ管理**: api.log, web.logは自動記録

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

## Claudeログ監視システム

君が以下のコマンドを実行すると、自動でエラー検出・修正を行います：

```
Claude, please check these log files for errors and fix any issues:
- Web Log: /home/ryosuke/note/web.log
- API Log: /home/ryosuke/note/api.log
```
