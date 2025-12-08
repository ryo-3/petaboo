# PETABOO-55: タスク一覧がたまに表示されなくなってしまう

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## ステータス: ✅ 修正完了

## 問題の症状

1. **タスク一覧が空になる問題**
   - ボード詳細画面からタスク一覧に遷移すると、タスクが0件表示される
   - 本番環境でのみ発生
   - リロードすると直る

2. **サイドバーアイコンが更新されない問題**
   - メモ/タスク一覧を開いても、サイドバーのアイコンがホームのままハイライトされる
   - ログでは`iconStates.memo: true`なのにUIに反映されない
   - 本番環境でのみ発生

## 原因

### 1. タスク一覧が空になる問題

`useTasks`フックで`placeholderData: []`が設定されていたため、`teamId`が未確定の状態で空配列が返されていた。

### 2. サイドバーアイコンの問題

**SSRハイドレーション不整合**が原因。

- SSR時: `iconStates.home = true`（初期状態）でHTMLが生成される
- CSR時: `iconStates.memo = true`（URL解析後の正しい状態）に更新
- **しかしハイドレーション後にDOMが更新されない**（Reactがサーバー生成のHTMLと一致しないと判断し、更新をスキップ）

## 修正内容

### 1. `use-tasks.ts` - placeholderDataの削除

```typescript
// 変更前
placeholderData: [], // 初回も即座に空配列を表示

// 変更後
// PETABOO-55: placeholderDataを削除 - teamId未確定時に空配列を返さないようにする
```

### 2. `team/[customUrl]/layout.tsx` - Sidebarをdynamic importに変更

```typescript
// 変更前
import Sidebar from "@/components/layout/sidebar";

// 変更後
// PETABOO-55: SSRハイドレーション問題を回避するため、Sidebarをクライアントサイドのみでレンダリング
const Sidebar = dynamic(() => import("@/components/layout/sidebar"), {
  ssr: false,
});
```

これにより、SidebarはSSR時にはレンダリングされず、クライアントサイドでのみレンダリングされるため、ハイドレーション不整合が発生しない。

## 変更ファイル

- `apps/web/src/hooks/use-tasks.ts`
  - `useTasks`: `placeholderData: []`を削除
  - `useDeletedTasks`: `placeholderData: []`を削除
- `apps/web/components/screens/task-screen.tsx`
  - デバッグログ追加（タスク一覧が異常に空の時のみ）
- `apps/web/src/contexts/navigation-context.tsx`
  - デバッグログ追加（iconStates計算結果）
- `apps/web/components/layout/sidebar.tsx`
  - デバッグログ追加（iconStates受信）
- `apps/web/app/team/[customUrl]/layout.tsx`
  - Sidebarをdynamic importでSSR無効化

## 学んだこと

- Next.jsのSSR + クライアントサイドの状態管理は、ハイドレーション不整合を起こしやすい
- URLパラメータに依存する状態は、SSR時とCSR時で異なる値になりやすい
- `dynamic import`で`ssr: false`を指定することで、ハイドレーション問題を回避できる
- 本番環境でのみ発生する問題は、SSR関連の可能性が高い（開発環境ではSSRの挙動が異なる場合がある）
