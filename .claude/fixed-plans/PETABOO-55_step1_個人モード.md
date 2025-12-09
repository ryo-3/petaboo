# PETABOO-55 Step 1: 個人モード キャッシュ統一

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## ステータス: 🔄 計画中

## 目標

```
個人モードの保存処理を統一
- 共通キャッシュ更新関数を作成
- invalidate/refetch を削除
- setQueryData のみで完結
```

---

## 作成するファイル

### `apps/web/src/lib/cache-utils.ts`

```typescript
import { QueryClient } from "@tanstack/react-query";
import type { Task } from "@/src/types/task";
import type { Memo } from "@/src/types/memo";

// =============================================================================
// 型定義
// =============================================================================

export type ItemType = "task" | "memo";
export type Operation =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "permanentDelete";

// =============================================================================
// キャッシュキー生成
// =============================================================================

export const getCacheKey = (itemType: ItemType, teamId?: number): string[] => {
  if (teamId) {
    return [`team-${itemType}s`, teamId.toString()];
  }
  return [itemType === "task" ? "tasks" : "memos"];
};

export const getDeletedCacheKey = (
  itemType: ItemType,
  teamId?: number,
): string[] => {
  if (teamId) {
    return [`team-deleted-${itemType}s`, teamId.toString()];
  }
  return itemType === "task" ? ["deleted-tasks"] : ["deletedMemos"];
};

// =============================================================================
// メインのキャッシュ更新関数
// =============================================================================

interface UpdateItemCacheParams {
  queryClient: QueryClient;
  itemType: ItemType;
  operation: Operation;
  item: Task | Memo;
  teamId?: number;
  boardId?: number;
}

export const updateItemCache = ({
  queryClient,
  itemType,
  operation,
  item,
  teamId,
  boardId,
}: UpdateItemCacheParams): void => {
  const cacheKey = getCacheKey(itemType, teamId);
  const deletedCacheKey = getDeletedCacheKey(itemType, teamId);

  switch (operation) {
    case "create":
      // 一覧に追加
      queryClient.setQueryData<(Task | Memo)[]>(cacheKey, (old) => [
        ...(old || []),
        item,
      ]);
      break;

    case "update":
      // 一覧の該当アイテムを置換
      queryClient.setQueryData<(Task | Memo)[]>(cacheKey, (old) =>
        old?.map((i) => (i.id === item.id ? item : i)),
      );
      break;

    case "delete":
      // 一覧から削除 + 削除済みに追加
      queryClient.setQueryData<(Task | Memo)[]>(cacheKey, (old) =>
        old?.filter((i) => i.id !== item.id),
      );
      queryClient.setQueryData<(Task | Memo)[]>(deletedCacheKey, (old) => [
        ...(old || []),
        item,
      ]);
      break;

    case "restore":
      // 削除済みから削除 + 一覧に追加
      queryClient.setQueryData<(Task | Memo)[]>(deletedCacheKey, (old) =>
        old?.filter((i) => i.id !== item.id),
      );
      queryClient.setQueryData<(Task | Memo)[]>(cacheKey, (old) => [
        ...(old || []),
        item,
      ]);
      break;

    case "permanentDelete":
      // 削除済みから削除のみ
      queryClient.setQueryData<(Task | Memo)[]>(deletedCacheKey, (old) =>
        old?.filter((i) => i.id !== item.id),
      );
      break;
  }

  // ボード連携
  if (boardId) {
    updateBoardItemCache({
      queryClient,
      boardId,
      itemType,
      operation,
      item,
      teamId,
    });
  }
};

// =============================================================================
// ボードキャッシュ更新関数
// =============================================================================

interface UpdateBoardItemCacheParams {
  queryClient: QueryClient;
  boardId: number;
  itemType: ItemType;
  operation: Operation;
  item: Task | Memo;
  teamId?: number;
}

interface BoardItem {
  type: ItemType;
  item: Task | Memo;
}

export const updateBoardItemCache = ({
  queryClient,
  boardId,
  itemType,
  operation,
  item,
  teamId,
}: UpdateBoardItemCacheParams): void => {
  const boardCacheKey = teamId
    ? ["team-boards", teamId.toString(), boardId.toString(), "items"]
    : ["boards", boardId.toString(), "items"];

  switch (operation) {
    case "create":
    case "restore":
      queryClient.setQueryData<BoardItem[]>(boardCacheKey, (old) => [
        ...(old || []),
        { type: itemType, item },
      ]);
      break;

    case "update":
      queryClient.setQueryData<BoardItem[]>(boardCacheKey, (old) =>
        old?.map((i) =>
          i.type === itemType && i.item.id === item.id ? { ...i, item } : i,
        ),
      );
      break;

    case "delete":
      queryClient.setQueryData<BoardItem[]>(boardCacheKey, (old) =>
        old?.filter((i) => !(i.type === itemType && i.item.id === item.id)),
      );
      break;

    case "permanentDelete":
      // ボードキャッシュは変更なし（削除済みアイテムはボードに表示されない）
      break;
  }
};
```

---

## 修正するファイル

### 優先度順

| #   | ファイル                       | invalidate数 | 内容                       |
| --- | ------------------------------ | ------------ | -------------------------- |
| 1   | use-tasks.ts                   | 17           | タスクCRUD                 |
| 2   | use-memos.ts                   | 14           | メモCRUD                   |
| 3   | use-unified-item-operations.ts | 16           | 統一削除/復元              |
| 4   | use-boards.ts                  | 15           | ボードCRUD（個人部分のみ） |

---

## 修正パターン

### Before（現状）

```typescript
// use-tasks.ts の useCreateTask 例
onSuccess: (newTask) => {
  // 楽観的更新
  queryClient.setQueryData<Task[]>(["tasks"], (oldTasks) => {
    if (!oldTasks) return [newTask];
    return [...oldTasks, newTask];
  });

  // 不要な invalidate
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["boards"] });
  queryClient.invalidateQueries({ queryKey: ["taggings"] });
};
```

### After（修正後）

```typescript
import { updateItemCache } from "@/src/lib/cache-utils";

// use-tasks.ts の useCreateTask 例
onSuccess: (newTask) => {
  updateItemCache({
    queryClient,
    itemType: "task",
    operation: "create",
    item: newTask,
    boardId: newTask.boardId, // あれば
  });
};
```

---

## 具体的な修正箇所

### 1. use-tasks.ts

| Hook                   | 操作            | 修正内容                                 |
| ---------------------- | --------------- | ---------------------------------------- |
| useCreateTask          | create          | `updateItemCache` に置換                 |
| useUpdateTask          | update          | `updateItemCache` に置換                 |
| useDeleteTask          | delete          | `updateItemCache` に置換、invalidate削除 |
| useRestoreTask         | restore         | `updateItemCache` に置換、invalidate削除 |
| usePermanentDeleteTask | permanentDelete | `updateItemCache` に置換                 |

**削除対象:**

- `invalidateQueries` (17箇所)
- `refetchQueries` (該当箇所)
- `keepPreviousData: true` → `false` に変更

### 2. use-memos.ts

| Hook                   | 操作            | 修正内容                                 |
| ---------------------- | --------------- | ---------------------------------------- |
| useCreateMemo          | create          | `updateItemCache` に置換                 |
| useUpdateMemo          | update          | `updateItemCache` に置換、setTimeout削除 |
| useDeleteMemo          | delete          | `updateItemCache` に置換、invalidate削除 |
| useRestoreMemo         | restore         | `updateItemCache` に置換、invalidate削除 |
| usePermanentDeleteMemo | permanentDelete | `updateItemCache` に置換                 |

**削除対象:**

- `invalidateQueries` (14箇所)
- `refetchQueries` (該当箇所)
- `setTimeout` + `refetchQueries` の組み合わせ

### 3. use-unified-item-operations.ts

| Hook                   | 操作            | 修正内容                 |
| ---------------------- | --------------- | ------------------------ |
| useDeleteItem          | delete          | `updateItemCache` に置換 |
| useRestoreItem         | restore         | `updateItemCache` に置換 |
| usePermanentDeleteItem | permanentDelete | `updateItemCache` に置換 |

**削除対象:**

- `invalidateQueries` (16箇所)
- `refetchQueries` (8箇所)
- predicate による広範囲マッチ

### 4. use-boards.ts（個人モード部分のみ）

ボードは比較的整理されているので、確認のみ。
必要なら `updateBoardItemCache` を使用。

---

## 実装手順

### Phase 1: 共通関数作成

1. [ ] `apps/web/src/lib/cache-utils.ts` を作成
2. [ ] 型チェック通過を確認

### Phase 2: use-tasks.ts 修正

1. [ ] `updateItemCache` をインポート
2. [ ] 各hookのonSuccessを修正
3. [ ] invalidate/refetch を削除
4. [ ] keepPreviousData: false に変更
5. [ ] テスト

### Phase 3: use-memos.ts 修正

1. [ ] Phase 2 と同じパターンで修正
2. [ ] setTimeout + refetch を削除
3. [ ] テスト

### Phase 4: use-unified-item-operations.ts 修正

1. [ ] Phase 2 と同じパターンで修正
2. [ ] predicate マッチを削除
3. [ ] テスト

### Phase 5: 最終確認

1. [ ] npm run check:wsl 通過
2. [ ] 動作確認（作成/更新/削除/復元）
3. [ ] invalidate 数を再カウント

---

## テスト項目

### タスク

- [ ] タスク作成 → 一覧に即座に表示
- [ ] タスク更新 → 一覧に即座に反映
- [ ] タスク削除 → 一覧から消える、削除済みに追加
- [ ] タスク復元 → 削除済みから消える、一覧に追加
- [ ] タスク完全削除 → 削除済みから消える

### メモ

- [ ] メモ作成 → 一覧に即座に表示
- [ ] メモ更新 → 一覧に即座に反映
- [ ] メモ削除 → 一覧から消える、削除済みに追加
- [ ] メモ復元 → 削除済みから消える、一覧に追加
- [ ] メモ完全削除 → 削除済みから消える

### ボード連携

- [ ] ボード詳細でタスク/メモ操作 → ボード内の表示が更新
- [ ] ボード詳細 → タスク一覧遷移 → タスクが正しく表示（PETABOO-55）

### パフォーマンス

- [ ] Network タブで不要なAPIコールが減少

---

## 期待される効果

| 項目                            | Before                 | After         |
| ------------------------------- | ---------------------- | ------------- |
| invalidateQueries（個人モード） | 62箇所                 | 0〜5箇所      |
| refetchQueries（個人モード）    | 多数                   | 0             |
| コードの重複                    | 各ファイルで似たコード | 共通関数1箇所 |

---

## 注意事項

1. **チームモードは Step 2 で対応** - この Step では個人モードのみ
2. **タグ/カテゴリは後回し** - まずメインのタスク/メモから
3. **ボード操作は確認のみ** - 既に整理されている可能性

---

## 関連ファイル

- 設計方針: `.claude/開発メモ/キャッシュ設計方針.md`
- 現状分析: `.claude/開発メモ/キャッシュ現状分析.md`
