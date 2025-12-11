# PETABOO-55 Step4: チームモードキャッシュ完全統一

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## ステータス: 🚧 実装中

## 目的

PETABOO-55のキャッシュ問題を完全に解決する。

- チームモードでのタスク/メモ/ボード一覧が空になる問題
- 不要なinvalidate + refetchによるパフォーマンス低下とUIちらつき

## 変更方針

### 1. `placeholderData: []` の削除（5箇所）

| ファイル           | 行  | 対応 |
| ------------------ | --- | ---- |
| use-team-tasks.ts  | 78  | 削除 |
| use-team-tasks.ts  | 111 | 削除 |
| use-team-memos.ts  | 63  | 削除 |
| use-team-memos.ts  | 97  | 削除 |
| use-team-boards.ts | 100 | 削除 |

### 2. `setTimeout + refetchQueries` パターンの削除

**use-memos.ts 302-309行:**

```typescript
// 削除対象
setTimeout(() => {
  queryClient.refetchQueries({
    predicate: (query) => {
      const key = query.queryKey as string[];
      return key[0] === "team-boards" && key[1] === teamId.toString();
    },
  });
}, 1000);
```

→ `setQueryData`で既に更新済みのため不要

### 3. `invalidate + refetch` の `setQueryData` 化

**use-memos.ts useDeleteMemo (430-476行):**
現状: `invalidate + refetch` を大量に使用
対応:

- 削除済みリストへの追加は既に`setQueryData`で実装済み
- ボード連携部分の`invalidate + refetch`を削除
- 必要なら`updateItemCache`経由でボードキャッシュも更新

**use-tasks.ts useDeleteTask (チームモード部分):**
同様に`invalidate + refetch`を削除

### 4. use-team-boards.ts の最適化

**useCreateTeamBoard (148-169行):**

```typescript
// 現状
queryClient.setQueryData(...) // OK
queryClient.invalidateQueries(["team-boards", teamId, "completed"]);
queryClient.invalidateQueries(["team-boards", teamId, "deleted"]);
```

→ 新規作成時に他ステータスに影響しないためinvalidate不要

**useUpdateTeamBoard (210-226行):**

```typescript
// 現状: 全ステータスinvalidate
["normal", "completed", "deleted"].forEach(...)
```

→ `setQueryData`で該当ボードのみ更新

**useToggleTeamBoardCompletion (294-306行):**

```typescript
// 現状: 全ステータスinvalidate
["normal", "completed", "deleted"].forEach(...)
```

→ `setQueryData`で移動元から削除、移動先に追加

---

## 実装手順

### Step 1: placeholderData削除

```diff
// use-team-tasks.ts:78
-    placeholderData: [], // 初回も即座に空配列を表示
+    // PETABOO-55: placeholderData削除 - teamId未確定時に空配列を返さないようにする

// use-team-tasks.ts:111
-    placeholderData: [], // 初回も即座に空配列を表示
+    // PETABOO-55: placeholderData削除

// use-team-memos.ts:63
-    placeholderData: [], // 初回も即座に空配列を表示
+    // PETABOO-55: placeholderData削除

// use-team-memos.ts:97
-    placeholderData: [], // 初回も即座に空配列を表示
+    // PETABOO-55: placeholderData削除

// use-team-boards.ts:100
-      placeholderData: [], // 初回も即座に空配列を表示
+      // PETABOO-55: placeholderData削除
```

### Step 2: setTimeout + refetchQueries 削除

```diff
// use-memos.ts:302-309
-        setTimeout(() => {
-          queryClient.refetchQueries({
-            predicate: (query) => {
-              const key = query.queryKey as string[];
-              return key[0] === "team-boards" && key[1] === teamId.toString();
-            },
-          });
-        }, 1000);
+        // PETABOO-55: setQueryDataで既に更新済みのため遅延refetch不要
```

### Step 3: useDeleteMemo のinvalidate + refetch削除

```diff
// use-memos.ts:430-476 (チームモード部分)
        // ボード連携部分を削除
-        queryClient.invalidateQueries({
-          predicate: (query) => {
-            const key = query.queryKey as string[];
-            return (
-              key[0] === "team-deleted-memos" && key[1] === teamId?.toString()
-            );
-          },
-        });
+        // PETABOO-55: setQueryDataで既に更新済み

        // 以下も削除（teamItemBoardsの分岐全体）
-        const deletedMemoDisplayId = deletedMemo?.displayId || id.toString();
-        const teamItemBoards = queryClient.getQueryData<{ id: number }[]>([
-          "team-item-boards",
-          teamId,
-          "memo",
-          deletedMemoDisplayId,
-        ]);
-        if (teamItemBoards && teamItemBoards.length > 0) {
-          teamItemBoards.forEach((board) => {
-            queryClient.invalidateQueries({...});
-            queryClient.refetchQueries({...});
-          });
-        } else {
-          queryClient.invalidateQueries({...});
-          queryClient.refetchQueries({...});
-        }
+        // PETABOO-55: ボードキャッシュはupdateItemCache経由で更新
+        // メモがボードに紐づいている場合、cache-utilsのupdateBoardItemCacheで処理
```

### Step 4: useDeleteTask のinvalidate + refetch削除 (use-tasks.ts)

同様のパターンで削除

### Step 5: use-team-boards.ts の最適化

**useCreateTeamBoard:**

```diff
    onSuccess: (newBoard, { teamId }) => {
      queryClient.setQueryData<BoardWithStats[]>(
        ["team-boards", teamId, "normal"],
        (oldBoards) => {
          if (!oldBoards) return [newBoard];
          return [...oldBoards, newBoard];
        },
      );
-      // 他のステータスのキャッシュも無効化（統計情報の整合性のため）
-      queryClient.invalidateQueries({
-        queryKey: ["team-boards", teamId, "completed"],
-      });
-      queryClient.invalidateQueries({
-        queryKey: ["team-boards", teamId, "deleted"],
-      });
+      // PETABOO-55: 新規作成はnormal状態のみ影響するため他ステータスのinvalidate不要
    },
```

**useUpdateTeamBoard:**

```diff
-    onSuccess: () => {
-      // 全ステータスのキャッシュを無効化
-      ["normal", "completed", "deleted"].forEach((status) => {
-        queryClient.invalidateQueries({
-          queryKey: ["team-boards", teamId, status],
-        });
-      });
-      // ボード詳細のキャッシュも無効化
-      queryClient.invalidateQueries({
-        queryKey: ["team-board", teamId],
-      });
-      showToast("ボードが更新されました", "success");
-    },
+    onSuccess: (updatedBoard, { id }) => {
+      // PETABOO-55: setQueryDataで該当ボードのみ更新
+      ["normal", "completed", "deleted"].forEach((status) => {
+        queryClient.setQueryData<BoardWithStats[]>(
+          ["team-boards", teamId, status],
+          (oldBoards) => {
+            if (!oldBoards) return oldBoards;
+            return oldBoards.map((board) =>
+              board.id === id ? { ...board, ...updatedBoard } : board
+            );
+          },
+        );
+      });
+      showToast("ボードが更新されました", "success");
+    },
```

**useToggleTeamBoardCompletion:**

```diff
-    onSuccess: () => {
-      // 全ステータスのキャッシュを無効化
-      ["normal", "completed", "deleted"].forEach((status) => {
-        queryClient.invalidateQueries({
-          queryKey: ["team-boards", teamId, status],
-        });
-      });
-      showToast("ボードの完了状態が更新されました", "success");
-    },
+    onSuccess: (result, boardId) => {
+      // PETABOO-55: setQueryDataで移動元から削除、移動先に追加
+      const fromStatus = result.isCompleted ? "normal" : "completed";
+      const toStatus = result.isCompleted ? "completed" : "normal";
+
+      // 移動元から削除
+      queryClient.setQueryData<BoardWithStats[]>(
+        ["team-boards", teamId, fromStatus],
+        (oldBoards) => oldBoards?.filter((b) => b.id !== boardId),
+      );
+
+      // 移動先に追加
+      queryClient.setQueryData<BoardWithStats[]>(
+        ["team-boards", teamId, toStatus],
+        (oldBoards) => {
+          if (!oldBoards) return [result];
+          return [...oldBoards, result];
+        },
+      );
+
+      showToast("ボードの完了状態が更新されました", "success");
+    },
```

---

## 影響範囲

- チームモードのタスク一覧画面
- チームモードのメモ一覧画面
- チームモードのボード一覧画面
- チームボード詳細画面

## テスト項目

1. チームタスク一覧が正しく表示されること
2. チームメモ一覧が正しく表示されること
3. チームボード一覧が正しく表示されること
4. 各操作後にUIが即時更新されること
5. 画面遷移後にデータが消えないこと
6. 定期取得（60秒）が正常に動作すること

## 備考

- フック重複問題（use-tasks.ts と use-team-tasks.ts の共存）は今回は対応しない
- 根本的な解決は別チケットで対応予定
