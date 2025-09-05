# Petaboo 管理画面

Petabooの管理者用ダッシュボードです。ユーザーデータの閲覧・管理が行えます。

## 🌐 アクセス

### ローカル開発環境
- **URL**: http://localhost:3010
- **パスワード**: `admin123` (デフォルト)

### 本番データ環境  
- **URL**: http://localhost:3030
- **パスワード**: `admin123` (デフォルト)

## 🚀 起動方法

### ローカルデータで管理画面起動
```bash
cd apps/admin
npm run dev:local
```

### 本番データで管理画面起動
```bash
cd apps/admin  
npm run dev:prod
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

- **ローカル**: ポート3010番で起動（WebアプリやAPIと分離）
- **本番データ**: ポート3030番で起動  
- React 18使用（Refine互換性のため）
- **React Query v4.36.1**: Refine互換性のためダウングレード済み
- Turbopack は無効（互換性問題のため）

## 🔧 最新修正事項

### Next.js API Routes プロキシ実装
ブラウザセキュリティポリシー（CORS）問題を解決するため、Next.js API Routesを中継プロキシとして実装：

```
ブラウザ → /api/users (Next.js API Route) → http://localhost:7594/users (実際のAPI)
```

- **ファイル**: `app/api/users/route.ts`
- **利点**: セキュリティポリシー回避、確実なデータ取得

## ⚠️ 重要な注意事項

### **必ずRefineドキュメントに従うこと**
- 実装前に必ずRefineの公式ドキュメントを確認する
- 勝手な実装はせず、推奨パターンに従う
- useForm, Edit, Show等のフックとコンポーネントの正しい使い方を守る

### API制限事項
- **個別ユーザーエンドポイント（GET /api/users/:id）は403エラーが発生**
- 個別取得が必要な場合は useList で全データを取得してクライアント側でフィルタリング
- useForm使用時は `queryOptions: { enabled: false }` で個別取得を無効化

### 実装パターン

#### Edit コンポーネント
```typescript
const { formProps, saveButtonProps } = useForm({
  resource: "users",
  action: "edit",
  id: userId,
  redirect: false,
  queryOptions: {
    enabled: false, // 個別取得API無効化（403回避）
  },
  mutationOptions: {
    onSuccess: () => message.success('保存成功'),
    onError: (error) => message.error('保存失敗'),
  },
});

// 表示用データは別途useListで取得
const { data: usersData, isLoading } = useList({
  resource: "users",
});
const userData = usersData?.data?.find((user: any) => user.id === userId);

return (
  <Edit
    isLoading={isLoading}
    saveButtonProps={saveButtonProps}
  >
    <Form {...formProps} layout="vertical">
      {/* フォームフィールド */}
    </Form>
  </Edit>
);
```

#### Show コンポーネント
```typescript
const { data: usersData, isLoading } = useList({
  resource: "users",
});
const record = usersData?.data?.find((user: any) => user.id === userId);

return (
  <Show isLoading={isLoading}>
    <Form layout="vertical" style={{ pointerEvents: "none" }}>
      {/* 読み取り専用フィールド */}
    </Form>
  </Show>
);
```

## 🚫 禁止事項

- **Refineドキュメントを読まずに勝手に実装すること**
- **useFormの403エラーを無視すること**  
- **独自の保存処理を勝手に作ること**
- **Refineの推奨パターンを無視すること**

## 🐛 デバッグチェックリスト

- [ ] ブラウザのコンソールで403エラーが出ていないか確認
- [ ] useFormのqueryOptions.enabledがfalseになっているか確認
- [ ] saveButtonPropsが正しくEditコンポーネントに渡されているか確認
- [ ] フォームの初期値が正しく設定されているか確認

## 📖 Refine公式ドキュメント対応

### データプロバイダーカスタマイズ（公式方法）

#### 1. CLI Swizzle使用
```bash
npx refine swizzle
# @refinedev/simple-rest を選択
# data-provider/index.ts が生成される
```

#### 2. カスタムデータプロバイダー作成（実装済み）
```typescript
// lib/data-provider.ts
import dataProvider from "@refinedev/simple-rest";

// Next.js API Routesをプロキシとして使用（ブラウザセキュリティポリシー回避）
const API_URL = "/api";

export const customDataProvider = {
  ...dataProvider(API_URL),
  
  update: async ({ resource, id, variables }) => {
    // カスタムupdate処理
    if (resource === "users") {
      // 複数エンドポイント試行
      const endpoints = [
        { method: 'PUT', url: `/api/${resource}/${id}` },
        { method: 'PATCH', url: `/api/${resource}/${id}` },
        { method: 'POST', url: `/api/admin/${resource}/${id}` }
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variables)
          });
          
          if (response.ok) {
            return { data: { id, ...variables } };
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    // デフォルト処理
    return dataProvider("/api").update({ resource, id, variables });
  },

  getOne: async ({ resource, id }) => {
    // 403エラー回避：リストから個別取得
    if (resource === "users") {
      const listResult = await dataProvider("/api").getList({
        resource,
        pagination: { current: 1, pageSize: 1000 }
      });
      
      const item = listResult.data.find((user) => user.id === id);
      if (!item) throw new Error(`${resource} ${id} not found`);
      
      return { data: item };
    }
    
    return dataProvider("/api").getOne({ resource, id });
  }
};
```

#### 3. プロバイダー登録
```typescript
// layout-client.tsx
import { customDataProvider } from "../lib/data-provider";

<Refine
  dataProvider={customDataProvider}
  // ...
/>
```

### useFormの正しい使用方法

```typescript
// pages/edit/[id]/page.tsx
const { formProps, saveButtonProps } = useForm({
  resource: "users",
  action: "edit",
  id: userId,
  redirect: false,
  queryOptions: {
    enabled: true, // カスタムgetOneが動作するため
  },
  mutationOptions: {
    onSuccess: () => message.success('保存成功'),
    onError: (error) => message.error('保存失敗'),
  },
});

// データ取得完了後に初期値設定
React.useEffect(() => {
  if (userData && formProps.form) {
    formProps.form.setFieldsValue({
      planType: userData.planType,
      // ...
    });
  }
}, [userData, formProps.form]);

return (
  <Edit
    saveButtonProps={saveButtonProps}
  >
    <Form {...formProps} layout="vertical">
      {/* フィールド */}
    </Form>
  </Edit>
);
```

## 🔧 トラブルシューティング

### 問題：保存時404エラー
**原因**: APIにPATCH/PUT エンドポイントが存在しない

**解決法**:
1. カスタムデータプロバイダーで複数エンドポイント試行
2. API側で更新エンドポイント実装

### 問題：フォーム初期値が表示されない
**原因**: useFormのqueryOptionsでenabledがfalseになっている

**解決法**:
1. カスタムgetOneメソッドで403エラー回避
2. useEffectで手動初期値設定