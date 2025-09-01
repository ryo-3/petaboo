# Petaboo

**個人・チーム向け統合メモ・タスク管理システム**

## 概要

Petabooは、メモとタスクを効率的に管理するための統合プラットフォームです。個人利用からチーム共同作業まで、様々なシーンに対応しています。

### 主な機能

- **メモ管理**: 思考の記録・整理
- **タスク管理**: TODO・進捗管理
- **ボード機能**: プロジェクト単位での組織化
- **チーム機能**: 共同作業環境（プレミアム機能）

## 技術スタック

- **フロントエンド**: Next.js 15.4 + TypeScript + Tailwind CSS
- **バックエンド**: Hono + Cloudflare Workers + SQLite/D1
- **認証**: Clerk
- **状態管理**: React Query
- **パッケージ管理**: pnpm + Turborepo

## 開発環境セットアップ

### 前提条件

- Node.js 18+
- pnpm 9+
- Cloudflare CLI (wrangler)

### インストール

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

### 開発サーバー起動

```bash
# 全体起動（ログ付き）
npm run dev

# 個別起動
cd apps/web && npm run dev     # Web (http://localhost:7593)
cd apps/api && npm run dev     # API (http://localhost:7594)
```

### 品質チェック

```bash
# TypeScript + Lint チェック
npm run check:wsl              # Web
npm run check:api              # API
npm run check:full             # 全体
```

## デプロイメント

### 本番環境

- **Frontend**: Vercel
- **API**: Cloudflare Workers
- **Database**: Cloudflare D1

### デプロイコマンド

```bash
# API デプロイ
wrangler deploy

# Web デプロイ（Vercel）
# vercel.com から自動デプロイ
```

## プロジェクト構成

```
petaboo/
├── apps/
│   ├── web/          # Next.js フロントエンド
│   └── api/          # Hono API サーバー
├── packages/
│   ├── ui/           # 共通UIコンポーネント
│   └── eslint-config/# ESLint設定
└── wrangler.toml     # Cloudflare Workers設定
```

## 開発ガイドライン

- **共通化ファースト**: 重複コードの徹底排除
- **型安全性**: TypeScript厳格運用
- **品質管理**: ESLint + Prettier自動適用
- **コミット規約**: 日本語でのわかりやすいメッセージ

## ライセンス

Private Project
