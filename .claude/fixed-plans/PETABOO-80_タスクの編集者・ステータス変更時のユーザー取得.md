# PETABOO-80: タスクの編集者・ステータスタブ切り換え時のユーザーを取得できるようにする

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → 必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

チームタスクにおいて、タスクを最後に編集したユーザー（編集者）の情報を記録・表示できるようにする。
現在、ステータス変更履歴ではユーザー名が表示されているが、タスク全体の「最終編集者」の情報は保存されていない。

---

## 現状分析

### 既に実装済みの機能（PETABOO-23）

- **ステータス変更履歴**: `teamTaskStatusHistory`テーブルに`userId`を保存
- **履歴取得時のユーザー名表示**: `teamMembers.displayName`とJOINして取得
- **DateInfo内のStatusDisplay**: ステータス履歴をポップオーバーで表示

### 未実装の機能

1. タスクの「最終編集者（updatedBy）」フィールドがスキーマに存在しない
2. DateInfoの「編集」部分に編集者名が表示されない

---

## 実装案

### 案A: updatedByフィールドを追加（推奨）

タスクテーブルに`updatedBy`フィールドを追加し、タスク更新時に編集者を記録する。

**メリット**:

- シンプルな実装
- 「誰が最後に編集したか」が一目でわかる
- ステータス以外の編集（タイトル、説明文など）も追跡できる

**デメリット**:

- DBマイグレーションが必要

### 案B: ステータス変更履歴のみで対応

現状のステータス変更履歴を活用し、ステータス変更時のユーザーのみを表示。

**メリット**:

- DBマイグレーション不要

**デメリット**:

- ステータス以外の編集者は追跡できない

---

## 推奨実装（案A）

### Step 1: DBスキーマ変更（チームタスクのみ）

**ファイル**: `apps/api/src/db/schema/team/tasks.ts`

```typescript
export const teamTasks = sqliteTable("team_tasks", {
  // ... 既存フィールド
  updatedAt: integer("updated_at"),
  updatedBy: text("updated_by"), // ← 追加：最終編集者のユーザーID
  deletedAt: integer("deleted_at"),
});
```

※ **個人タスクは変更不要**（単一ユーザーなので編集者情報は不要）

### Step 2: マイグレーション生成・実行

```bash
npm run db:generate
npm run db:migration:local
```

### Step 3: API更新 - タスク更新時にupdatedByを保存（チームのみ）

**ファイル**: `apps/api/src/routes/teams/tasks.ts`

PUT /teams/:teamId/tasks/:id のハンドラ内：

```typescript
// 更新時にupdatedByを記録
await db
  .update(teamTasks)
  .set({
    ...updateData,
    updatedAt: Math.floor(Date.now() / 1000),
    updatedBy: auth.userId, // ← 追加
  })
  .where(eq(teamTasks.id, id));
```

※ **個人タスクAPIは変更不要**

### Step 4: API更新 - タスク取得時にupdatedByのユーザー名を返す

**ファイル**: `apps/api/src/routes/teams/tasks.ts`

GET /teams/:teamId/tasks のレスポンスに`updatedByName`を追加：

```typescript
// JOINでupdatedByのdisplayNameを取得
.leftJoin(
  teamMembers,
  and(
    eq(teamTasks.updatedBy, teamMembers.userId),
    eq(teamTasks.teamId, teamMembers.teamId)
  )
)
```

レスポンス例：

```json
{
  "id": 1,
  "title": "タスクタイトル",
  "updatedAt": 1702274400,
  "updatedBy": "user_xxx",
  "updatedByName": "山田太郎"
}
```

### Step 5: フロントエンド型定義更新

**ファイル**: `apps/web/src/types/task.ts`

```typescript
export interface Task {
  // ... 既存フィールド
  updatedAt: number | null;
  updatedBy?: string | null; // ← 追加：最終編集者ID
  updatedByName?: string | null; // ← 追加：最終編集者名（チーム用）
}
```

### Step 6: DateInfoコンポーネント更新

**ファイル**: `apps/web/components/shared/date-info.tsx`

「編集」部分に編集者名を表示（**作成者と異なる場合のみ**）：

```tsx
{
  showEditTime && (
    <span className="flex items-center gap-1">
      <span>編集</span>
      <span>{formatDate(latestEditTime)}</span>
      {/* 編集者が作成者と異なる場合のみ表示 */}
      {teamMode && item.updatedByName && item.updatedBy !== item.userId && (
        <span className="text-gray-400">({item.updatedByName})</span>
      )}
    </span>
  );
}
```

### Step 7: ステータス履歴のユーザー名表示更新

**ファイル**: `apps/web/components/shared/date-info.tsx`

StatusDisplay内のユーザー名表示を更新（**作成者と異なる場合のみ**）：

```tsx
{
  /* ステータス変更者が作成者と異なる場合のみ表示 */
}
{
  teamMode && item.userName && item.userId !== taskCreatorId && (
    <span className="text-gray-400 truncate">{item.userName}</span>
  );
}
```

※ これを実現するために、履歴APIのレスポンスに`userId`を追加し、フロントで作成者IDと比較する

---

## 影響範囲

### 変更ファイル

- `apps/api/src/db/schema/team/tasks.ts` - スキーマ変更
- `apps/api/src/routes/teams/tasks.ts` - API更新（PUT、GET、status-history）
- `apps/web/src/types/task.ts` - 型定義更新
- `apps/web/components/shared/date-info.tsx` - UI更新

※ **個人タスク関連は変更なし**

### 新規ファイル

- なし

---

## 懸念点・注意事項

1. **既存タスクのupdatedBy**
   - 既存タスクの`updatedBy`はNULLになる
   - NULL時は編集者名を表示しない（日時のみ表示）

2. **パフォーマンス**
   - タスク取得時にteamMembersとのJOINが追加される
   - 既にステータス履歴取得でJOINしているので、影響は最小限

3. **個人タスク**
   - **変更なし**（単一ユーザーなので編集者情報は不要）

---

## Codex用ToDoリスト

- [ ] チームタスクスキーマに`updatedBy`フィールド追加（**個人タスクは変更不要**）
- [ ] マイグレーション生成・実行
- [ ] チームタスクPUT APIで`updatedBy`を保存
- [ ] チームタスクGET APIで`updatedByName`を返す（teamMembersとJOIN）
- [ ] チームステータス履歴APIのレスポンスに`userId`を追加
- [ ] フロントエンド型定義に`updatedBy`と`updatedByName`を追加
- [ ] フロントエンド型定義（TaskStatusHistoryItem）に`userId`を追加
- [ ] DateInfoコンポーネントで編集者名を表示（**作成者と異なる場合のみ**）
- [ ] StatusDisplayでステータス変更者名を表示（**作成者と異なる場合のみ**）
- [ ] 動作確認

---

https://petaboo.vercel.app/team/moricrew?board=PETABOO&task=80
