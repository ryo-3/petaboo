# PETABOO-55 Step 3: 競合チェック（楽観的ロック）

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## ステータス: 📋 計画中

## 前提

- **Step 1 完了**: 個人モード キャッシュ統一
- **Step 2 完了**: チームモード キャッシュ統一
- チームモードでは複数メンバーが同時に同じアイテムを編集する可能性がある

---

## 目標

```
チームモードで競合（同時編集）を検知し、データ上書きを防止

方式: 楽観的ロック（Optimistic Locking）
- フロント: 更新時に updatedAt を送信
- API: updatedAt を比較、不一致なら 409 Conflict
- フロント: 409 受信時にトーストで通知 + 最新データで更新
```

---

## 楽観的ロックとは

```
1. ユーザーAがアイテムを開く（updatedAt: 1000）
2. ユーザーBがアイテムを開く（updatedAt: 1000）
3. ユーザーAが保存（updatedAt: 1000 → 2000 に更新）
4. ユーザーBが保存（updatedAt: 1000 を送信）
   → API側で比較: DB(2000) ≠ クライアント(1000)
   → 409 Conflict を返す
5. ユーザーBに「他のメンバーが変更しました」と通知
6. 最新データ（updatedAt: 2000）でUIを更新
```

**メリット:**

- ロック待ちが発生しない
- 実装がシンプル
- 競合は稀なので、ほとんどの場合はスムーズ

---

## 修正範囲

### API側（apps/api）

| ファイル                           | 変更内容                           |
| ---------------------------------- | ---------------------------------- |
| `src/middleware/conflict-check.ts` | 新規作成: 競合チェックミドルウェア |
| `src/routes/teams/tasks/api.ts`    | PUT に競合チェック追加             |
| `src/routes/teams/memos/api.ts`    | PUT に競合チェック追加             |

### フロント側（apps/web）

| ファイル                            | 変更内容                                               |
| ----------------------------------- | ------------------------------------------------------ |
| `src/hooks/use-team-tasks.ts`       | useUpdateTeamTask に updatedAt 送信 + 409 ハンドリング |
| `src/hooks/use-team-memos.ts`       | useUpdateTeamMemo に updatedAt 送信 + 409 ハンドリング |
| `src/hooks/use-simple-item-save.ts` | チームモード保存時に updatedAt 送信                    |

---

## 実装詳細

### 1. API側: 競合チェックミドルウェア

**新規ファイル:** `apps/api/src/middleware/conflict-check.ts`

```typescript
import type { D1Database } from "@cloudflare/workers-types";

interface ConflictCheckResult {
  conflict: boolean;
  reason?: "not_found" | "outdated";
  currentUpdatedAt?: number;
}

/**
 * 楽観的ロックによる競合チェック
 * @param db - D1データベース
 * @param tableName - テーブル名（team_tasks, team_memos）
 * @param id - アイテムID
 * @param clientUpdatedAt - クライアントが持つ updatedAt
 * @returns 競合チェック結果
 */
export const checkConflict = async (
  db: D1Database,
  tableName: string,
  id: number,
  clientUpdatedAt: number | null | undefined,
): Promise<ConflictCheckResult> => {
  // updatedAt が送信されていない場合はチェックスキップ（後方互換性）
  if (clientUpdatedAt === null || clientUpdatedAt === undefined) {
    return { conflict: false };
  }

  const current = await db
    .prepare(`SELECT updatedAt FROM ${tableName} WHERE id = ?`)
    .bind(id)
    .first<{ updatedAt: number | null }>();

  if (!current) {
    return { conflict: true, reason: "not_found" };
  }

  // DB の updatedAt とクライアントの updatedAt を比較
  if (current.updatedAt !== clientUpdatedAt) {
    return {
      conflict: true,
      reason: "outdated",
      currentUpdatedAt: current.updatedAt ?? undefined,
    };
  }

  return { conflict: false };
};
```

### 2. API側: チームタスク更新に競合チェック追加

**ファイル:** `apps/api/src/routes/teams/tasks/api.ts`

**変更箇所:** PUT ハンドラ

```typescript
// リクエストボディに updatedAt を追加
interface UpdateTeamTaskBody {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: number;
  categoryId?: number;
  boardCategoryId?: number;
  updatedAt?: number; // 追加
}

// PUT ハンドラ内
const { updatedAt: clientUpdatedAt, ...updateData } = body;

// 競合チェック
const conflictResult = await checkConflict(
  db,
  "team_tasks",
  taskId,
  clientUpdatedAt,
);

if (conflictResult.conflict) {
  // 最新データを取得して返す
  const latestTask = await db
    .prepare("SELECT * FROM team_tasks WHERE id = ?")
    .bind(taskId)
    .first();

  return c.json(
    {
      error: "Conflict",
      message:
        conflictResult.reason === "not_found"
          ? "タスクが見つかりません"
          : "他のメンバーが変更しました",
      latestData: latestTask,
    },
    409,
  );
}

// 更新処理（既存コード）
```

### 3. フロント側: 409 エラーハンドリング

**ファイル:** `apps/web/src/hooks/use-team-tasks.ts`

**変更箇所:** useUpdateTeamTask

```typescript
import { useToast } from "@/src/contexts/toast-context";

export function useUpdateTeamTask(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      updatedAt, // 追加: 現在の updatedAt を受け取る
    }: {
      id: number;
      data: UpdateTeamTaskData;
      updatedAt?: number; // 追加
    }) => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/tasks/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            ...data,
            updatedAt, // 追加: updatedAt を送信
          }),
        },
      );

      if (response.status === 409) {
        const errorData = await response.json();
        const error = new Error("Conflict") as Error & {
          status: number;
          latestData: TeamTask;
        };
        error.status = 409;
        error.latestData = errorData.latestData;
        throw error;
      }

      if (!response.ok) {
        throw new Error("Failed to update team task");
      }

      return response.json() as Promise<TeamTask>;
    },
    onSuccess: (updatedTask) => {
      updateItemCache({
        queryClient,
        itemType: "task",
        operation: "update",
        item: updatedTask,
        teamId,
      });
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
    onError: (error: Error & { status?: number; latestData?: TeamTask }) => {
      if (error.status === 409 && error.latestData) {
        // 競合エラー: 最新データでキャッシュを更新
        showToast(
          "他のメンバーが変更しました。最新の内容を表示します。",
          "warning",
        );
        updateItemCache({
          queryClient,
          itemType: "task",
          operation: "update",
          item: error.latestData,
          teamId,
        });
      } else {
        showToast("タスクの更新に失敗しました", "error");
      }
    },
  });
}
```

### 4. フロント側: 保存時に updatedAt を送信

**ファイル:** `apps/web/src/hooks/use-simple-item-save.ts`

保存処理で `updatedAt` を含めて送信するように修正。

```typescript
// チームタスク更新時
updateTeamTask.mutate({
  id: task.id,
  data: updateData,
  updatedAt: task.updatedAt, // 追加
});
```

---

## 実装手順

### Phase 1: API側（競合チェック基盤）

1. [ ] `src/middleware/conflict-check.ts` を新規作成
2. [ ] `src/routes/teams/tasks/api.ts` の PUT に競合チェック追加
3. [ ] `src/routes/teams/memos/api.ts` の PUT に競合チェック追加
4. [ ] API テスト（409 が返ることを確認）

### Phase 2: フロント側（409 ハンドリング）

1. [ ] `use-team-tasks.ts` に updatedAt 送信 + 409 ハンドリング追加
2. [ ] `use-team-memos.ts` に updatedAt 送信 + 409 ハンドリング追加
3. [ ] `use-simple-item-save.ts` でチームモード保存時に updatedAt 送信

### Phase 3: テスト

1. [ ] `npm run check:wsl` / `npm run check:api` 通過
2. [ ] 競合シナリオのテスト
   - 同じタスクを2つのブラウザで開く
   - 片方で保存
   - もう片方で保存 → 409 + トースト表示を確認

---

## テスト項目

### 正常系

- [ ] チームタスク更新 → 成功（競合なし）
- [ ] チームメモ更新 → 成功（競合なし）
- [ ] updatedAt を送信しない古いクライアント → 成功（後方互換）

### 競合系

- [ ] 同じタスクを2人が同時編集 → 後から保存した方に 409
- [ ] 409 時にトースト「他のメンバーが変更しました」が表示
- [ ] 409 時に最新データでUIが更新される

### エッジケース

- [ ] アイテムが削除された後に更新 → 409（not_found）
- [ ] ネットワークエラー時 → 通常のエラーハンドリング

---

## 期待される効果

| 項目                     | Before                     | After           |
| ------------------------ | -------------------------- | --------------- |
| 同時編集時のデータ上書き | 後勝ち（データ消失リスク） | 競合検知 + 通知 |
| ユーザー体験             | 気づかずに上書き           | 明示的な通知    |

---

## 注意事項

1. **後方互換性**: updatedAt が送信されない場合はチェックをスキップ
2. **削除操作は対象外**: 削除は競合チェック不要（削除済みなら 404）
3. **個人モードは対象外**: 個人モードは同時編集がないため不要

---

## 関連ファイル

- 設計方針: `.claude/開発メモ/キャッシュ設計方針.md`
- Step 1: `.claude/fixed-plans/PETABOO-55_step1_個人モード.md`
- Step 2: `.claude/fixed-plans/PETABOO-55_step2_チームモード.md`
