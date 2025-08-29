# Refine実装ガイド

## 概要

Refineを使った管理画面実装での学び。独自API構造に合わせようとして複雑化したが、最終的にRefineの標準パターンに合わせることで解決。

## 失敗したアプローチ

### 問題点

- 既存の独自API構造（`/users/me`, `/users/:id/plan`）にRefineを無理やり合わせようとした
- 200行以上の複雑なカスタムdataProviderを作成
- URL抽出、ログ、エラーハンドリングを過度に実装
- Refineの標準パターンを無視した実装

### 結果

- Hooksの順序エラーが多発
- dataProviderの型エラー
- `s[x] is not a function` エラー
- 認証が正しく動作しない

## 成功したアプローチ

### 基本方針

1. **Refineの標準に従う** - フレームワークのパターンに合わせる
2. **必要最小限の実装** - 複雑なカスタムロジックを避ける
3. **既存APIと新APIの混在を許可** - 完全な統一よりも実用性を重視

### 実装内容

#### 1. APIエンドポイントの追加

既存APIに加えて、Refineが期待するCRUDエンドポイントを追加：

```typescript
// apps/api/src/routes/users/api.ts
export const getUsersListRoute = createRoute({
  method: "get",
  path: "/", // GET /users
  request: {
    query: z.object({
      _start: z.string().optional(),
      _end: z.string().optional(),
      _sort: z.string().optional(),
      _order: z.string().optional(),
    }),
  },
  // ...
});
```

#### 2. シンプルなdataProvider

50行程度のシンプルな実装：

```typescript
const simpleDataProvider = React.useMemo(() => {
  return {
    getList: async ({ resource, pagination }: any) => {
      // 新しいCRUDエンドポイントを使用
      const response = await fetch(
        `${API_URL}/${resource}?_start=${start}&_end=${end}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return { data: await response.json(), total: data.length };
    },

    getOne: async ({ resource, id }: any) => {
      // 既存の個別取得エンドポイントを使用
      const response = await fetch(`${API_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { data: await response.json() };
    },

    update: async ({ resource, id, variables }: any) => {
      // 既存のプラン変更エンドポイントを使用
      const response = await fetch(`${API_URL}/users/${id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ planType: variables.planType }),
        headers: { Authorization: `Bearer ${token}` },
      });
      return { data: await response.json() };
    },
  } as any;
}, [getToken]);
```

#### 3. 標準的なRefine設定

```typescript
<Refine
  dataProvider={simpleDataProvider}
  resources={[{
    name: "users",
    list: "/admin/users",
    show: "/admin/users/show/:id",
    edit: "/admin/users/edit/:id",
  }]}
>
```

## 教訓

### DO（すべきこと）

- ✅ フレームワークの標準パターンに従う
- ✅ 最初からRefineのドキュメント通りに実装
- ✅ 必要最小限のCRUDエンドポイントを追加
- ✅ 既存APIとの混在を許可（実用性優先）
- ✅ シンプルなdataProviderから始める

### DON'T（避けるべきこと）

- ❌ 独自API構造に無理やりフレームワークを合わせる
- ❌ 最初から複雑なカスタムdataProviderを作る
- ❌ フレームワークの型システムを無視する
- ❌ 過度なログやエラーハンドリングを実装
- ❌ 標準パターンを無視した独自実装

## 実装手順

1. **基本構造の確認**
   - Refineが期待するRESTful APIの構造を理解
   - 既存APIとのギャップを洗い出し

2. **最小限のCRUDエンドポイント追加**
   - `GET /{resource}` (一覧取得)
   - 既存エンドポイントはそのまま活用

3. **シンプルなdataProvider実装**
   - 型エラーは `as any` で一時的に回避
   - 複雑なロジックは後回し

4. **基本機能の動作確認**
   - 一覧表示 → 詳細表示 → 編集の流れをテスト

5. **段階的な改善**
   - 型安全性の向上
   - エラーハンドリングの追加
   - UI/UXの改善

## 参考

- [Refine Data Provider](https://refine.dev/docs/data/data-provider/)
- [Simple REST Data Provider](https://refine.dev/docs/packages/data-providers/simple-rest/)

## 作成日

2025-08-29

## 関連ファイル

- `apps/web/app/admin/layout.tsx` - Refine設定とdataProvider
- `apps/api/src/routes/users/api.ts` - CRUDエンドポイント
- `apps/web/app/admin/users/page.tsx` - ユーザー一覧ページ
