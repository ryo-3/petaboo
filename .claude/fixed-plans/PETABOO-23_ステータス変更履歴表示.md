# PETABOO-23: ステータス変更履歴表示

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → 必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

タスクがいつ「完了」「進行中」などに変更されたかを確認できるようにする。
エディター下部に折りたたみ式で履歴を表示。

## 表示仕様

### 場所

- タスクエディター下部（作成日・編集日の近く）
- デフォルトは**折りたたみ（非表示）**
- クリックで展開

### 表示形式

```
▶ ステータス履歴    ← クリックで展開

▼ ステータス履歴    ← 展開後
  ✓ 完了 (12/11 14:30)
  → 確認中 (12/10 16:30)
  → 進行中 (12/09 09:00)
  ○ 作成 (12/08 18:00)
```

### チームの場合

変更者名を表示：

```
  ✓ 完了 (12/11 14:30) 山田
  → 進行中 (12/09 09:00) 佐藤
```

---

## データベース設計

### 個人タスク履歴テーブル

```sql
CREATE TABLE task_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  from_status TEXT,           -- 変更前（作成時はNULL）
  to_status TEXT NOT NULL,    -- 変更後
  changed_at INTEGER NOT NULL, -- Unix timestamp
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_status_history_task_id ON task_status_history(task_id);
```

### チームタスク履歴テーブル

```sql
CREATE TABLE team_task_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,      -- 変更したユーザー
  from_status TEXT,           -- 変更前（作成時はNULL）
  to_status TEXT NOT NULL,    -- 変更後
  changed_at INTEGER NOT NULL, -- Unix timestamp
  FOREIGN KEY (task_id) REFERENCES team_tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_task_status_history_task_id ON team_task_status_history(task_id);
```

---

## 実装手順

### Step 1: DBスキーマ追加

**ファイル**: `apps/api/src/db/schema/tasks.ts`

```typescript
// 追加
export const taskStatusHistory = sqliteTable("task_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  userId: text("user_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedAt: integer("changed_at").notNull(),
});
```

**ファイル**: `apps/api/src/db/schema/team/tasks.ts`

```typescript
// 追加
export const teamTaskStatusHistory = sqliteTable("team_task_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedAt: integer("changed_at").notNull(),
});
```

### Step 2: マイグレーション生成・実行

```bash
npm run db:generate
npm run db:migration:local
```

### Step 3: API実装

#### 3-1: 個人タスク - ステータス変更時に履歴保存

**ファイル**: `apps/api/src/routes/tasks/route.ts`

PUT /tasks/:id のステータス更新処理に追加：

```typescript
// ステータスが変更された場合、履歴を保存
if (parsed.data.status && parsed.data.status !== existingTask.status) {
  await db.insert(taskStatusHistory).values({
    taskId: id,
    userId: auth.userId,
    fromStatus: existingTask.status,
    toStatus: parsed.data.status,
    changedAt: Math.floor(Date.now() / 1000),
  });
}
```

#### 3-2: チームタスク - ステータス変更時に履歴保存

**ファイル**: `apps/api/src/routes/teams/tasks.ts`

PUT /teams/:teamId/tasks/:id のステータス更新処理に追加：

```typescript
// ステータスが変更された場合、履歴を保存
if (status && status !== existingTask.status) {
  await db.insert(teamTaskStatusHistory).values({
    taskId: id,
    teamId: teamId,
    userId: auth.userId,
    fromStatus: existingTask.status,
    toStatus: status,
    changedAt: Math.floor(Date.now() / 1000),
  });
}
```

#### 3-3: 履歴取得API追加

**個人タスク**: GET /tasks/:id/status-history
**チームタスク**: GET /teams/:teamId/tasks/:id/status-history

レスポンス形式：

```json
{
  "history": [
    {
      "id": 1,
      "fromStatus": "in_progress",
      "toStatus": "completed",
      "changedAt": 1702274400,
      "userName": "山田太郎" // チームのみ
    }
  ]
}
```

### Step 4: フロントエンド型定義

**ファイル**: `apps/web/src/types/task.ts`

```typescript
export interface TaskStatusHistoryItem {
  id: number;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  changedAt: number;
  userName?: string; // チームのみ
}
```

### Step 5: フロントエンドフック

**ファイル**: `apps/web/src/hooks/use-task-status-history.ts`（新規）

```typescript
export function useTaskStatusHistory(taskId: number | null, teamId?: number) {
  // 履歴取得のuseQuery
}
```

### Step 6: UIコンポーネント

**ファイル**: `apps/web/components/features/task/task-status-history.tsx`（新規）

- 折りたたみ式の履歴表示
- ステータスアイコン（✓ → ○）
- 日時フォーマット
- チームの場合は変更者名表示

### Step 7: タスクエディターに組み込み

**ファイル**: `apps/web/components/features/task/task-editor.tsx`

DateInfoコンポーネントの近くに`<TaskStatusHistory />`を追加

---

## 影響範囲

### 変更ファイル

- `apps/api/src/db/schema/tasks.ts`
- `apps/api/src/db/schema/team/tasks.ts`
- `apps/api/src/routes/tasks/route.ts`
- `apps/api/src/routes/teams/tasks.ts`
- `apps/web/src/types/task.ts`
- `apps/web/components/features/task/task-editor.tsx`

### 新規ファイル

- `apps/web/src/hooks/use-task-status-history.ts`
- `apps/web/components/features/task/task-status-history.tsx`

---

## 懸念点・注意事項

1. **既存タスクの履歴**
   - 既存タスクには履歴がない
   - 「履歴がありません」または非表示で対応

2. **タスク作成時の初期履歴**
   - 作成時に `fromStatus: null, toStatus: "todo"` を記録するか検討
   - → 一旦記録しない（ステータス「変更」のみ記録）

3. **削除タスクの履歴**
   - CASCADE削除でタスク削除時に履歴も削除

4. **パフォーマンス**
   - 履歴は必要時のみ取得（折りたたみ展開時）
   - または初回ロード時に一緒に取得

---

## Codex用ToDoリスト

- [ ] DBスキーマに `taskStatusHistory` テーブル追加
- [ ] DBスキーマに `teamTaskStatusHistory` テーブル追加
- [ ] マイグレーション生成・実行
- [ ] 個人タスクPUT APIにステータス履歴保存処理追加
- [ ] チームタスクPUT APIにステータス履歴保存処理追加
- [ ] 個人タスク履歴取得API追加（GET /tasks/:id/status-history）
- [ ] チームタスク履歴取得API追加（GET /teams/:teamId/tasks/:id/status-history）
- [ ] `TaskStatusHistoryItem` 型定義追加
- [ ] `useTaskStatusHistory` フック作成
- [ ] `TaskStatusHistory` コンポーネント作成（折りたたみ式）
- [ ] `task-editor.tsx` に履歴コンポーネント組み込み
- [ ] 動作確認（個人・チーム両方）
