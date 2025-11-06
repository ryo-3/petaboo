# タスク担当者機能の実装計画書

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイル名の冒頭に `fixed-` をつける**
>   → 例: `task-assignee-feature.md` → `fixed-task-assignee-feature.md`

---

## 📋 目的

チームボード内のタスクに「担当者（Assignee）」機能を追加し、ボード参加メンバーを選択・割り当てできるようにする。

### 期待成果

- タスクステータスバーの優先度欄の右側に担当者選択UIを配置
- ボード参加メンバーから担当者を選択可能
- 既存のメンション機能（@機能）のUIロジックを流用して実装効率化
- チーム側のみの実装（個人タスクには適用しない）
- 未割り当て状態も選択可能

---

## 🔍 事前調査結果

### ✅ 確認済み事項

1. **メンション機能の実装場所**
   - `apps/web/components/features/comments/comment-section.tsx`
   - メンバー一覧の取得・表示・選択UIが実装済み
   - アバター表示、displayName、role判定などが参考になる

2. **ボードメンバー情報の取得**
   - `useTeamDetail(customUrl)` フックで取得可能
   - `TeamMember` 型: `{ userId, displayName, role, joinedAt, avatarColor }`

3. **タスクフォームの構造**
   - `apps/web/components/features/task/task-form.tsx`
   - `statusOnly` モード（Line 228-279）にステータス・優先度・期限が表示
   - 優先度の右側に担当者セレクターを追加予定

4. **DBスキーマの現状**
   - `apps/api/src/db/schema/team/tasks.ts`
   - `team_tasks` テーブル: assigneeId カラムは未存在
   - `team_deleted_tasks` テーブル: 同様に未存在

5. **型定義の現状**
   - `apps/web/src/types/task.ts`
   - `Task` インターフェース: assigneeId プロパティは未存在

---

## 🎯 実装範囲

### Phase 1: データベース変更（マイグレーション）

**ファイル**: `apps/api/drizzle/migrations/0011_add_assignee_to_tasks.sql`（新規作成）

```sql
-- team_tasks テーブルに担当者カラムを追加
ALTER TABLE team_tasks ADD COLUMN assignee_id TEXT;

-- team_deleted_tasks テーブルにも追加
ALTER TABLE team_deleted_tasks ADD COLUMN assignee_id TEXT;
```

**実装ポイント**:

- カラム型: `TEXT`（Clerk の userId を格納）
- NULL 許可（未割り当て状態を許容）
- インデックス不要（検索頻度が低い）

---

### Phase 2: スキーマ定義の更新

**ファイル**: `apps/api/src/db/schema/team/tasks.ts`

**変更内容**:

```typescript
export const teamTasks = sqliteTable("team_tasks", {
  // ... 既存フィールド
  assigneeId: text("assignee_id"), // ← 追加
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const teamDeletedTasks = sqliteTable("team_deleted_tasks", {
  // ... 既存フィールド
  assigneeId: text("assignee_id"), // ← 追加
  deletedAt: integer("deleted_at").notNull(),
});
```

---

### Phase 3: 型定義の更新

**ファイル**: `apps/web/src/types/task.ts`

**変更内容**:

```typescript
export interface Task extends BaseItemFields, TeamCreatorFields {
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: number | null;
  categoryId: number | null;
  boardCategoryId: number | null;
  assigneeId?: string | null; // ← 追加
  commentCount?: number;
}

export interface DeletedTask
  extends BaseItemFields,
    TeamCreatorFields,
    DeletedItemFields {
  originalId: OriginalId;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: number | null;
  categoryId: number | null;
  boardCategoryId: number | null;
  assigneeId?: string | null; // ← 追加
  commentCount?: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null;
  assigneeId?: string | null; // ← 追加
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null;
  assigneeId?: string | null; // ← 追加
}
```

---

### Phase 4: API更新

**ファイル**: `apps/api/src/routes/teams/tasks.ts`

**変更箇所**:

1. **タスク作成処理**
   - リクエストボディから `assigneeId` を受け取る
   - DB挿入時に `assigneeId` を含める

2. **タスク更新処理**
   - リクエストボディから `assigneeId` を受け取る
   - DB更新時に `assigneeId` を含める

3. **タスク取得処理**
   - SELECT で `assigneeId` を含める（既に `select()` で全フィールド取得していれば自動的に含まれる）

**実装例** (既存コードへの差分):

```typescript
// 作成処理（例）
const newTask = await db
  .insert(teamTasks)
  .values({
    // ... 既存フィールド
    assigneeId: body.assigneeId || null, // ← 追加
  })
  .returning();

// 更新処理（例）
await db
  .update(teamTasks)
  .set({
    // ... 既存フィールド
    assigneeId:
      body.assigneeId !== undefined ? body.assigneeId : existingTask.assigneeId, // ← 追加
  })
  .where(eq(teamTasks.id, taskId));
```

---

### Phase 5: フロントエンド実装

#### 5-1. 担当者セレクターコンポーネント作成

**ファイル**: `apps/web/components/ui/selectors/assignee-selector.tsx`（新規作成）

**設計思想**:

- メンション機能 (`comment-section.tsx`) の実装を参考
- ドロップダウン形式で担当者を選択
- アバター + 表示名で視認性向上
- 「未割り当て」オプションも提供

**Props**:

```typescript
interface AssigneeSelectorProps {
  value: string | null; // 現在の担当者ID
  onChange: (userId: string | null) => void; // 担当者変更時
  members: TeamMember[]; // ボードメンバー一覧
  disabled?: boolean; // 削除済みタスクなど
  compactMode?: boolean; // コンパクト表示
}
```

**UI仕様**:

- 未選択時: 「未割り当て」アイコン表示（グレーのユーザーアイコン）
- 選択時: 担当者のアバター + 表示名（短縮版）
- ドロップダウン:
  - 「未割り当て」オプション（一番上）
  - メンバー一覧（アバター + フルネーム + ロール表示）
  - 現在選択中のメンバーは背景色変更

**実装参考箇所**:

- `comment-section.tsx` Line 300-305: メンバーフィルタリング
- `comment-section.tsx` Line 838-873: メンションサジェストUI
- `custom-selector.tsx`: 基本的なセレクターUI構造

---

#### 5-2. TaskFormコンポーネントの更新

**ファイル**: `apps/web/components/features/task/task-form.tsx`

**変更箇所**:

1. **Props追加** (Line 31-76):

```typescript
interface TaskFormProps {
  // ... 既存Props
  assigneeId?: string | null; // ← 追加
  onAssigneeChange?: (value: string | null) => void; // ← 追加
  boardMembers?: TeamMember[]; // ← 追加（チームモード時のみ）
}
```

2. **statusOnly モードの更新** (Line 228-279):

```typescript
if (statusOnly) {
  return (
    <div className="flex gap-2 pl-2">
      <CustomSelector
        label="ステータス"
        // ... 既存実装
      />

      <CustomSelector
        label="優先度"
        // ... 既存実装
      />

      {/* ← 担当者セレクターを追加 */}
      {teamMode && boardMembers && (
        <div className="w-32">
          <AssigneeSelector
            value={assigneeId || null}
            onChange={onAssigneeChange || (() => {})}
            members={boardMembers}
            disabled={isDeleted}
            compactMode={true}
          />
        </div>
      )}

      <div className="flex-1 flex gap-2.5 items-center">
        <div className="w-28">
          <DatePickerSimple
            // ... 既存実装
          />
        </div>
        {/* ... 既存実装 */}
      </div>
    </div>
  );
}
```

3. **headerOnly モードの更新** (Line 282-372):
   - 同様に担当者セレクターを追加（Line 328付近に挿入）

4. **通常表示モードの更新** (Line 410-521):
   - 同様に担当者セレクターを追加（Line 450付近に挿入）

---

#### 5-3. タスクエディター統合

**ファイル**: タスクを編集する各画面（例: `apps/web/components/features/task/task-editor.tsx` など）

**変更内容**:

1. **状態管理の追加**:

```typescript
const [assigneeId, setAssigneeId] = useState<string | null>(
  task?.assigneeId || null,
);
```

2. **ボードメンバーの取得**:

```typescript
const { data: teamDetail } = useTeamDetail(customUrl);
const boardMembers = teamDetail?.members || [];
```

3. **TaskFormへのProps追加**:

```typescript
<TaskForm
  // ... 既存Props
  assigneeId={assigneeId}
  onAssigneeChange={setAssigneeId}
  boardMembers={boardMembers}
  teamMode={teamMode}
/>
```

4. **保存処理の更新**:

```typescript
const updatedTask = await updateTask({
  // ... 既存フィールド
  assigneeId: assigneeId,
});
```

---

## 🎨 UI配置イメージ

```
┌─────────────────────────────────────────────────────────┐
│ [ステータス▼] [優先度▼] [担当者▼] [期限📅] [カテゴリ]  │
│   未着手        中          田中      2025/1/15          │
└─────────────────────────────────────────────────────────┘
```

**担当者セレクターのドロップダウン**:

```
┌────────────────────────┐
│ ○ 未割り当て            │
│ ─────────────────────  │
│ 👤 田中太郎 (管理者)    │ ← 現在選択中（背景色）
│ 👤 鈴木花子             │
│ 👤 佐藤次郎             │
└────────────────────────┘
```

---

## 🔄 実装の流れ（Codex向けチェックリスト）

### ✅ Phase 1: データベース

- [ ] マイグレーションファイル作成
- [ ] `team_tasks.assignee_id` カラム追加
- [ ] `team_deleted_tasks.assignee_id` カラム追加
- [ ] `npm run db:generate` 実行（ローカル）

### ✅ Phase 2: スキーマ定義

- [ ] `apps/api/src/db/schema/team/tasks.ts` 更新
- [ ] `teamTasks` に `assigneeId` 追加
- [ ] `teamDeletedTasks` に `assigneeId` 追加

### ✅ Phase 3: 型定義

- [ ] `apps/web/src/types/task.ts` 更新
- [ ] `Task` インターフェース更新
- [ ] `DeletedTask` インターフェース更新
- [ ] `CreateTaskData` 更新
- [ ] `UpdateTaskData` 更新

### ✅ Phase 4: API

- [ ] `apps/api/src/routes/teams/tasks.ts` 更新
- [ ] タスク作成処理に `assigneeId` 追加
- [ ] タスク更新処理に `assigneeId` 追加
- [ ] （タスク取得は自動で含まれる）

### ✅ Phase 5: フロントエンド

- [ ] `AssigneeSelector.tsx` コンポーネント作成
- [ ] `TaskForm.tsx` Props 追加
- [ ] `TaskForm.tsx` statusOnly モード更新
- [ ] `TaskForm.tsx` headerOnly モード更新
- [ ] `TaskForm.tsx` 通常モード更新
- [ ] タスクエディターに統合
- [ ] 担当者の状態管理追加
- [ ] 保存処理に `assigneeId` 追加

### ✅ Phase 6: 動作確認

- [ ] チームボードでタスク作成
- [ ] 担当者を選択
- [ ] 保存後に担当者が表示されるか確認
- [ ] 担当者変更が可能か確認
- [ ] 「未割り当て」が選択可能か確認
- [ ] 削除済みタスクで disabled になるか確認

---

## ⚠️ 注意事項・懸念点

### 1. チームモードの判定

- `teamMode` prop を使用してチーム機能かどうかを判定
- 個人タスクでは担当者機能を表示しない

### 2. ボードメンバーの取得タイミング

- `useTeamDetail` は1分ごとにポーリング
- メンバー追加直後でも反映される

### 3. 担当者が削除された場合

- 現状では orphan レコードになる（userId が存在しないが assigneeId には残る）
- 将来的な改善: メンバー退出時に担当タスクを未割り当てに変更

### 4. パフォーマンス

- 担当者情報は追加のAPIリクエストなし（既存の `useTeamDetail` を流用）
- セレクターのメンバー数が多い場合でも問題なし（通常は10名以下）

### 5. UI/UX

- モバイルでのコンパクト表示対応
- セレクターの幅調整（デスクトップ: 160px、モバイル: 120px）
- アバター表示でメンバーを直感的に識別

---

## 📝 実装後の拡張可能性

### 短期的改善

- タスク一覧で担当者でフィルタリング
- 「自分が担当のタスク」ビュー追加
- 担当者変更時のアクティビティログ記録

### 中期的改善

- 担当者への通知機能
- 担当者がタスクステータスを変更した際の通知
- マイタスク専用ページ

### 長期的改善

- 複数担当者の割り当て
- 担当者の作業時間トラッキング
- 担当者の負荷分析ダッシュボード

---

## 📅 作成日時

2025-11-07

## 📝 ステータス

- [x] 仕様書作成完了
- [ ] ユーザー承認待ち
- [ ] Phase 1 実装
- [ ] Phase 2 実装
- [ ] Phase 3 実装
- [ ] Phase 4 実装
- [ ] Phase 5 実装
- [ ] Phase 6 動作確認完了

---

## 💬 ディスカッションポイント

1. **担当者セレクターの位置は優先度の右でOKか？**
   - 代替案: ステータスと優先度の間

2. **未割り当て時のアイコンデザインは？**
   - グレーのユーザーアイコン？
   - 「-」のようなシンプルな表示？

3. **削除済みタスクの担当者は表示するか？**
   - 表示のみ（変更不可）で良いか

4. **将来的に複数担当者対応は必要か？**
   - 現時点では1人のみで問題ないか
