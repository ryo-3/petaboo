# PETABOO-55: タスク一覧がたまに表示されなくなってしまう

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 問題の症状

- ボード詳細画面でアイテムがいくつもあるのに、タスク一覧に一個も表示されないことがある
- 本番環境でよく発生
- PETABOO-4と同じ類のバグの可能性

## 原因調査結果

### 1. キャッシュ設定の問題（最も可能性が高い）

**該当ファイル**: `apps/web/src/hooks/use-boards.ts:167-172`

```typescript
{
  enabled: boardId !== null && isLoaded && !skip,
  staleTime: 2 * 60 * 1000,      // 2分
  cacheTime: 10 * 60 * 1000,     // 10分
  refetchOnWindowFocus: false,   // ← 問題
  refetchOnMount: false,         // ← 問題
}
```

**問題点**:

- `refetchOnMount: false` - コンポーネントがマウントされても再フェッチしない
- `refetchOnWindowFocus: false` - ウィンドウがフォーカスされても再フェッチしない
- キャッシュが古いままで、新しく追加されたタスクが表示されない

### 2. contentがnullの場合のフィルタリング

**該当ファイル**: `apps/api/src/routes/boards/api.ts:1024`

```typescript
// 削除されたアイテムを除外
const validItems = itemsWithContent.filter((item) => item.content !== null);
```

タスクのcontentがnullになるケース:

- タスクが削除された場合（`tasks.deletedAt`がnullでない）
- displayIdの不整合がある場合

### 3. タスクステータスによるフィルタリング

**該当ファイル**: `apps/web/src/hooks/use-board-items.ts:107-110`

```typescript
return allTaskItems.filter((item: BoardItemWithContent) => {
  const task = item.content as Task;
  return task.status === activeTaskTab;
});
```

**問題点**:

- `task.status`が`undefined`または予期しない値の場合、すべてのタブでフィルタリングされる
- DBのstatusと表示中のactiveTaskTabが一致しない場合、タスクが非表示になる

## 修正方針

### 方針1: キャッシュ設定の見直し（推奨）

`useBoardWithItems`のキャッシュ設定を変更:

```typescript
{
  enabled: boardId !== null && isLoaded && !skip,
  staleTime: 30 * 1000,          // 30秒に短縮
  cacheTime: 5 * 60 * 1000,      // 5分に短縮
  refetchOnWindowFocus: true,    // フォーカス時に再フェッチ
  refetchOnMount: true,          // マウント時に再フェッチ（stale時のみ）
}
```

### 方針2: フィルタリングの安全対策

タスクステータスが不正な場合のフォールバック:

```typescript
// apps/web/src/hooks/use-board-items.ts
const taskItems = useMemo(() => {
  if (activeTaskTab === "deleted") {
    return (boardDeletedItems?.tasks || []).map(/* ... */);
  }
  return allTaskItems.filter((item: BoardItemWithContent) => {
    const task = item.content as Task;
    // statusが undefined または無効な値の場合は「todo」として扱う
    const status = task?.status || "todo";
    return status === activeTaskTab;
  });
}, [activeTaskTab, boardDeletedItems?.tasks, boardId, allTaskItems]);
```

### 方針3: デバッグログの追加（調査用）

本番環境でデバッグするために、一時的にログを追加:

```typescript
// apps/web/src/hooks/use-board-items.ts
const taskItems = useMemo(
  () => {
    // デバッグ: 全タスクアイテムの状態を出力
    if (
      process.env.NODE_ENV === "development" ||
      window.location.hostname.includes("vercel")
    ) {
      console.log("📊 Board Task Items Debug:", {
        allTaskItemsCount: allTaskItems.length,
        activeTaskTab,
        taskStatuses: allTaskItems.map((item) => ({
          id: item.content?.id,
          status: (item.content as Task)?.status,
          hasContent: !!item.content,
        })),
      });
    }
    // ...
  },
  [
    /* ... */
  ],
);
```

## 実装手順

### Step 1: キャッシュ設定の修正

**ファイル**: `apps/web/src/hooks/use-boards.ts`

- `useBoardWithItems`のオプションを変更
- `useBoardDeletedItems`も同様に変更

### Step 2: フィルタリングの安全対策

**ファイル**: `apps/web/src/hooks/use-board-items.ts`

- タスクステータスのnullチェックを追加
- contentがundefinedの場合のハンドリング

### Step 3: テスト確認

- ローカルで動作確認
- `npm run check:wsl`を実行

## 影響範囲

- `apps/web/src/hooks/use-boards.ts`
- `apps/web/src/hooks/use-board-items.ts`
- ボード詳細画面（個人・チーム両方）

## Codex用ToDoリスト

1. [ ] `apps/web/src/hooks/use-boards.ts`の`useBoardWithItems`関数のキャッシュ設定を変更
   - staleTime: 30秒
   - cacheTime: 5分
   - refetchOnWindowFocus: true
   - refetchOnMount: true（デフォルト）に変更

2. [ ] `apps/web/src/hooks/use-boards.ts`の`useBoardDeletedItems`関数も同様にキャッシュ設定を変更

3. [ ] `apps/web/src/hooks/use-board-items.ts`のタスクフィルタリングにnullチェックを追加

4. [ ] `npm run check:wsl`でビルドエラーがないことを確認

## 備考

- PETABOO-4との関連：おそらく同じキャッシュ問題が原因
- 本番環境で「たまに」発生する理由：キャッシュの有効期限（2分）内にアクセスした場合に古いデータが表示される
