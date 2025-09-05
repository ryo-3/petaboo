# Petaboo 管理画面

Petabooの管理者用ダッシュボードです。ユーザーデータの閲覧・管理が行えます。

## 🌐 アクセス

- **URL**: http://localhost:3000
- **パスワード**: `admin123` (デフォルト)

## 🚀 起動方法

```bash
cd apps/admin
npm run dev
```

## 🔧 設定

### 環境変数

`.env.local`ファイルで設定を変更できます：

```bash
# 管理者ログインパスワード
NEXT_PUBLIC_ADMIN_PASSWORD=admin123

# APIサーバーURL
NEXT_PUBLIC_API_URL=http://localhost:7594
```

### パスワード変更

管理画面のパスワードを変更するには：

1. `.env.local`ファイルの`NEXT_PUBLIC_ADMIN_PASSWORD`を変更
2. 管理画面を再起動

```bash
# 例：パスワードを変更
NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-password
```

## 📋 機能

- **ユーザー管理**: 登録ユーザーの一覧表示
- **プラン確認**: ユーザーのプラン種別（Free/Premium）
- **作成日表示**: ユーザー登録日の確認
- **セキュリティ**: パスワード認証によるアクセス制御

## 🏗️ 技術構成

- **フレームワーク**: Next.js 15.3.0 + React 18
- **UI**: Refine + Ant Design
- **認証**: セッションストレージベース
- **データ**: REST API (Simple Rest Provider)

## 📁 ファイル構成

```
apps/admin/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── layout-client.tsx   # クライアントレイアウト
│   ├── login/
│   │   └── page.tsx        # ログインページ
│   ├── users/
│   │   └── page.tsx        # ユーザー一覧ページ
│   └── page.tsx            # リダイレクトページ
├── .env.local              # 環境変数設定
├── package.json            # 依存関係
└── README.md               # このファイル
```

## 🔒 セキュリティ

- パスワード認証によるアクセス制御
- セッションストレージでの認証状態管理
- 環境変数による設定の外部化

## 📝 開発メモ

- ポート3000番で起動（WebアプリやAPIと分離）
- React 18使用（Refine互換性のため）
- Turbopackは無効（互換性問題のため）