# PETABOO-28: タスク一覧やメモ一覧でアイテム削除時に正しく次アイテム選択されない

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## ✅ 完了 (2025-12-05)

このタスクは完了しました。以下の修正を実施しました。

---

## 📍 問題の概要

1. **ボード詳細画面で削除済みアイテムを選択してもURLにboardIndexが反映されない**
2. **ボード詳細画面で削除済みアイテムの完全削除後、次のアイテムが正しく選択されない**
3. **個人のメモ一覧・タスク一覧で削除済みアイテムを選択してもURLが更新されない**

---

## 🛠️ 実施した修正

### 1. API修正：削除済みアイテムにboardIndexを含める

#### チームボード（`apps/api/src/routes/teams/boards.ts`）

- `leftJoin`を`innerJoin`に変更し、**そのボードに追加されていたアイテムのみ**を返すように修正
- 削除済みメモ/タスクのクエリで`boardIndex`を取得するようselect句を明示的に指定

```typescript
// Before: leftJoin → 全ての削除済みアイテムを返していた
// After: innerJoin → このボードに追加されていたアイテムのみを返す
.innerJoin(
  teamBoardItems,
  and(
    eq(teamBoardItems.displayId, teamMemos.displayId),
    eq(teamBoardItems.itemType, "memo"),
    eq(teamBoardItems.boardId, parseInt(boardId)),
  ),
)
```

#### 個人ボード（`apps/api/src/routes/boards/api.ts`）

- 削除済みアイテムのレスポンスに`boardIndex`を追加

```typescript
const contentWithBoardIndex = content
  ? { ...content, boardIndex: item.boardIndex }
  : null;
```

### 2. フロントエンド修正：削除済みアイテムにboardIndexを保持

#### `apps/web/src/hooks/use-boards.ts`

- `useBoardDeletedItems`でAPIレスポンスから`boardIndex`を取得するよう追加

```typescript
memos.push({
  // ... other fields
  boardIndex: item.content.boardIndex,
});
```

### 3. 次選択ロジックの修正

#### `apps/web/components/screens/board-detail-screen-3panel.tsx`

- `onDeleteAndSelectNext`のハンドラーで削除済みアイテムと通常アイテムを正しく区別
- 条件を`"id" in item`から`"deletedAt" in item && item.deletedAt`に変更

```typescript
onDeleteAndSelectNext={(task) => {
  if ("deletedAt" in task && task.deletedAt) {
    // 削除済みタスクの完全削除後の次選択
    handleDeletedTaskDeleteAndSelectNext(task as DeletedTask);
  } else {
    // 通常タスクの削除後の次選択
    handleTaskDeleteAndSelectNext(task as Task);
  }
}}
```

#### `apps/web/components/features/task/task-editor.tsx`

- `useDeletedTaskActions`に渡す`onDeleteAndSelectNext`で、削除済みタスクを正しく渡すように修正

```typescript
onDeleteAndSelectNext: (deletedTask: DeletedTask) => {
  if (onDeleteAndSelectNext) {
    onDeleteAndSelectNext(deletedTask as unknown as Task);
  } else if (onDelete) {
    onDelete();
  }
},
```

### 4. チームボード詳細ラッパーの修正

#### `apps/web/components/features/team/team-board-detail-wrapper.tsx`

- `handleSelectDeletedMemo`と`handleSelectDeletedTask`を追加
- 削除済みアイテム選択時もURL更新（boardIndexがある場合）

```typescript
const handleSelectDeletedTask = (task: DeletedTask | null) => {
  if (!task) return;
  setSelectedMemo(null);
  setSelectedTask(task as unknown as Task);
  if (task.boardIndex && task.boardIndex > 0) {
    router.replace(`/team/${customUrl}?board=${slug}&task=${task.boardIndex}`, {
      scroll: false,
    });
  }
};
```

### 5. 個人メモ/タスク一覧のURL更新

#### `apps/web/src/hooks/use-main-client-handlers.ts`

- `handleSelectDeletedMemo`と`handleSelectDeletedTask`でURL更新を追加（displayIdを使用）

```typescript
const handleSelectDeletedMemo = useCallback(
  (memo: DeletedMemo | null) => {
    if (memo) {
      // ... 他の処理
      if (!teamMode) {
        router.replace(`/?memo=${memo.displayId}`, { scroll: false });
      }
    }
    // ...
  },
  [
    /* deps */
  ],
);
```

### 6. キャッシュ管理の修正

#### `apps/web/src/hooks/use-tasks.ts`

- `refetchQueries`を`invalidateQueries`に変更（`Missing queryFn`エラー対策）
- `setQueryData`前にキャッシュ存在確認を追加

```typescript
// Before: refetchQueries → クエリがマウントされていないとエラー
// After: invalidateQueries → 安全にキャッシュを無効化
queryClient.invalidateQueries({
  queryKey: ["team-tasks", teamId],
  exact: true,
});
```

---

## 📁 修正ファイル一覧

| ファイル                                                          | 修正内容                           |
| ----------------------------------------------------------------- | ---------------------------------- |
| `apps/api/src/routes/teams/boards.ts`                             | innerJoin使用、boardIndex取得      |
| `apps/api/src/routes/boards/api.ts`                               | boardIndexをレスポンスに追加       |
| `apps/web/src/hooks/use-boards.ts`                                | boardIndexを保持                   |
| `apps/web/src/hooks/use-tasks.ts`                                 | キャッシュ管理修正                 |
| `apps/web/src/hooks/use-main-client-handlers.ts`                  | 削除済みアイテムのURL更新          |
| `apps/web/components/screens/board-detail-screen-3panel.tsx`      | 次選択ロジック修正                 |
| `apps/web/components/features/task/task-editor.tsx`               | 削除済みタスクのパラメータ渡し修正 |
| `apps/web/components/features/team/team-board-detail-wrapper.tsx` | 削除済みアイテムハンドラー追加     |

---

## ✅ テスト結果

- [x] チームボード詳細：削除済みメモ/タスク選択時にURLが更新される
- [x] チームボード詳細：削除済みアイテムの完全削除後、次のアイテムが選択される
- [x] 個人ボード詳細：削除済みメモ/タスク選択時にURLが更新される
- [x] 個人メモ一覧：削除済みメモ選択時にURLが更新される
- [x] 個人タスク一覧：削除済みタスク選択時にURLが更新される

---

**最終更新**: 2025-12-05
