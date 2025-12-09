# PETABOO-57: メモ/タスク削除時のボードキャッシュ無効化を最適化

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

メモ/タスク削除時の不要なボードキャッシュ再取得を最適化し、404エラーと無駄なAPIリクエストを防止する。

## 現状の問題

### 症状

- メモを複数削除すると `Failed to fetch board with items: 404 Not Found` エラーが発生
- 並行削除時に競合状態が発生

### 原因

`use-memos.ts:498` で以下を実行：

```typescript
queryClient.refetchQueries({ queryKey: ["boards"] });
```

これにより `["boards"]` で始まる全クエリが即座に再取得され：

1. `["boards", "normal"]` - ボード一覧
2. `["boards", "completed"]` - 完了済みボード一覧
3. `["boards", boardId, "items"]` - ボードアイテム詳細 ← **問題**

並行削除中に (3) が走ると、データ不整合で404が返る。

---

## 修正方針

**紐づいているボードのキャッシュだけを無効化する**

- ボードに紐づいていないメモ/タスク → 何もしない
- ボードに紐づいているメモ/タスク → 該当ボードのアイテムキャッシュのみ無効化

キャッシュから `["item-boards", "memo", displayId]` を参照して紐づきボードを特定。

---

## 変更範囲

### 対象ファイル

| ファイル                          | 変更内容                                 |
| --------------------------------- | ---------------------------------------- |
| `apps/web/src/hooks/use-memos.ts` | `useDeleteMemo` の `onSuccess` を修正    |
| `apps/web/src/hooks/use-tasks.ts` | `useDeleteTask` に同様の処理があれば修正 |

---

## 実装手順

### Step 1: use-memos.ts の修正

**ファイル:** `apps/web/src/hooks/use-memos.ts`

**変更箇所:** `useDeleteMemo` 関数の `onSuccess` 内（約496-498行目）

**Before:**

```typescript
// 削除済み一覧もバックグラウンドで無効化（安全性のため）
queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });
// ボード関連のキャッシュを強制再取得（統計が変わるため）
queryClient.refetchQueries({ queryKey: ["boards"] });
```

**After:**

```typescript
// 削除済み一覧もバックグラウンドで無効化（安全性のため）
queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });

// 紐づいているボードのアイテムキャッシュのみ無効化
// （紐づいていなければ何もしない）
const deletedMemoDisplayId = deletedMemo?.displayId || id.toString();
const itemBoards = queryClient.getQueryData<{ id: number }[]>([
  "item-boards",
  "memo",
  deletedMemoDisplayId,
]);
if (itemBoards && itemBoards.length > 0) {
  itemBoards.forEach((board) => {
    queryClient.invalidateQueries({ queryKey: ["boards", board.id, "items"] });
  });
}
```

### Step 2: use-tasks.ts の確認・修正

**ファイル:** `apps/web/src/hooks/use-tasks.ts`

`useDeleteTask` に同様の `refetchQueries({ queryKey: ["boards"] })` があれば、同じロジックで修正。

```typescript
// 紐づいているボードのアイテムキャッシュのみ無効化
const deletedTaskDisplayId = deletedTask?.displayId || id.toString();
const itemBoards = queryClient.getQueryData<{ id: number }[]>([
  "item-boards",
  "task",
  deletedTaskDisplayId,
]);
if (itemBoards && itemBoards.length > 0) {
  itemBoards.forEach((board) => {
    queryClient.invalidateQueries({ queryKey: ["boards", board.id, "items"] });
  });
}
```

---

## 影響範囲

- メモ一覧画面でのメモ削除
- タスク一覧画面でのタスク削除
- ボード詳細画面でのアイテム削除

### 動作の違い

| ケース                       | Before                   | After                |
| ---------------------------- | ------------------------ | -------------------- |
| ボードに紐づいてないメモ削除 | 全ボードキャッシュ再取得 | 何もしない           |
| ボードに紐づいてるメモ削除   | 全ボードキャッシュ再取得 | 該当ボードのみ無効化 |
| 複数メモ並行削除             | 競合で404エラー          | エラーなし           |

---

## Codex用ToDoリスト

- [ ] `apps/web/src/hooks/use-memos.ts` の `useDeleteMemo` を修正
  - `refetchQueries({ queryKey: ["boards"] })` を削除
  - キャッシュから紐づきボードを取得して該当ボードのみ `invalidateQueries`
- [ ] `apps/web/src/hooks/use-tasks.ts` の `useDeleteTask` を確認・修正
- [ ] `npm run check:wsl` で型エラーがないことを確認
- [ ] 手動テスト

---

## テスト観点

1. ボード詳細画面でメモを複数選択して一括削除 → 404エラーが出ない
2. ボード詳細画面でタスクを複数選択して一括削除 → 404エラーが出ない
3. メモ一覧画面でボードに紐づいてるメモ削除 → ボード詳細で正しく反映される
4. メモ一覧画面でボードに紐づいてないメモ削除 → 余計なリクエストが飛ばない
5. タスク一覧画面で同様のテスト
