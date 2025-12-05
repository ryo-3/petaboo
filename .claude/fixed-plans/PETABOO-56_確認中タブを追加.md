# PETABOO-56: 確認中タブを追加

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 📋 概要

タスクを完了済にした後バグが再発するケースが多数あるため、「確認中」ステータスを追加して、完了前の確認フェーズを設ける。

**タブ順序:** 未着手 → 進行中 → **確認中（新規）** → 完了 → 削除済み

## 🎯 目的

- 完了済みにする前に「確認中」ステータスで一時停止できるようにする
- バグ再発時の追跡を容易にする
- タスクの進捗状況をより細かく管理できるようにする

## 📁 変更対象ファイル一覧

### API層（2ファイル）

1. `apps/api/src/routes/tasks/route.ts` - 個人タスクAPIスキーマ
2. `apps/api/src/routes/teams/tasks.ts` - チームタスクAPIスキーマ

### 型定義（1ファイル）

3. `apps/web/src/types/task.ts` - TypeScript型定義

### UI層（3ファイル）

4. `apps/web/components/layout/desktop-upper.tsx` - タブ表示
5. `apps/web/components/layout/desktop-lower.tsx` - リスト表示
6. `apps/web/components/screens/task-screen.tsx` - タスク画面状態管理

### ユーティリティ（1ファイル）

7. `apps/web/src/utils/taskUtils.ts` - ステータス表示関数

---

## 🔧 実装手順

### Step 1: API層 - 個人タスクスキーマ修正

**ファイル:** `apps/api/src/routes/tasks/route.ts`

#### 1-1. TaskSchema修正（行30付近）

```diff
 const TaskSchema = z.object({
   id: z.number(),
   title: z.string(),
   description: z.string().nullable(),
-  status: z.enum(["todo", "in_progress", "completed"]),
+  status: z.enum(["todo", "in_progress", "checking", "completed"]),
   priority: z.enum(["high", "medium", "low"]),
```

#### 1-2. TaskInputSchema修正（行45付近）

```diff
 const TaskInputSchema = z.object({
   title: z.string().min(1),
   description: z.string().optional(),
-  status: z.enum(["todo", "in_progress", "completed"]).optional(),
+  status: z.enum(["todo", "in_progress", "checking", "completed"]).optional(),
   priority: z.enum(["high", "medium", "low"]).optional(),
```

#### 1-3. TaskUpdateSchema修正（行62付近）

```diff
 const TaskUpdateSchema = z.object({
   title: z.string().min(1).optional(),
   description: z.string().optional(),
-  status: z.enum(["todo", "in_progress", "completed"]).optional(),
+  status: z.enum(["todo", "in_progress", "checking", "completed"]).optional(),
   priority: z.enum(["high", "medium", "low"]).optional(),
```

---

### Step 2: API層 - チームタスクスキーマ修正

**ファイル:** `apps/api/src/routes/teams/tasks.ts`

#### 2-1. TeamTaskSchema修正（行38付近）

```diff
 const TeamTaskSchema = z.object({
   id: z.number(),
   title: z.string(),
   description: z.string().nullable(),
-  status: z.enum(["todo", "in_progress", "completed"]),
+  status: z.enum(["todo", "in_progress", "checking", "completed"]),
   priority: z.enum(["high", "medium", "low"]),
```

#### 2-2. TeamTaskInputSchema修正（行59付近）

```diff
 const TeamTaskInputSchema = z.object({
   title: z.string().min(1),
   description: z.string().optional(),
-  status: z.enum(["todo", "in_progress", "completed"]).optional(),
+  status: z.enum(["todo", "in_progress", "checking", "completed"]).optional(),
   priority: z.enum(["high", "medium", "low"]).optional(),
```

#### 2-3. TeamTaskUpdateSchema修正（行77付近）

```diff
 const TeamTaskUpdateSchema = z.object({
   title: z.string().min(1).optional(),
   description: z.string().optional(),
-  status: z.enum(["todo", "in_progress", "completed"]).optional(),
+  status: z.enum(["todo", "in_progress", "checking", "completed"]).optional(),
   priority: z.enum(["high", "medium", "low"]).optional(),
```

---

### Step 3: 型定義修正

**ファイル:** `apps/web/src/types/task.ts`

#### 3-1. Task型修正（行6付近）

```diff
 export interface Task {
   id: number;
   title: string;
   description: string | null;
-  status: "todo" | "in_progress" | "completed";
+  status: "todo" | "in_progress" | "checking" | "completed";
   priority: "high" | "medium" | "low";
```

#### 3-2. CreateTaskData型修正（行40付近）

```diff
 export interface CreateTaskData {
   title: string;
   description?: string;
-  status?: "todo" | "in_progress" | "completed";
+  status?: "todo" | "in_progress" | "checking" | "completed";
   priority?: "high" | "medium" | "low";
```

#### 3-3. UpdateTaskData型修正（行51付近）

```diff
 export interface UpdateTaskData {
   title?: string;
   description?: string;
-  status?: "todo" | "in_progress" | "completed";
+  status?: "todo" | "in_progress" | "checking" | "completed";
   priority?: "high" | "medium" | "low";
```

---

### Step 4: ユーティリティ関数修正

**ファイル:** `apps/web/src/utils/taskUtils.ts`

#### 4-1. getStatusColor関数修正

```diff
 export function getStatusColor(status: string): string {
   switch (status) {
     case "todo":
       return "bg-gray-100 text-gray-800";
     case "in_progress":
       return "bg-blue-100 text-blue-800";
+    case "checking":
+      return "bg-orange-100 text-orange-800";
     case "completed":
       return "bg-green-100 text-green-800";
     default:
       return "bg-gray-100 text-gray-800";
   }
 }
```

#### 4-2. getStatusText関数修正

```diff
 export function getStatusText(status: string): string {
   switch (status) {
     case "todo":
       return "未着手";
     case "in_progress":
       return "進行中";
+    case "checking":
+      return "確認中";
     case "completed":
       return "完了";
     default:
       return status;
   }
 }
```

#### 4-3. getStatusEditorColor関数修正

```diff
 export function getStatusEditorColor(status: string): string {
   switch (status) {
     case "todo":
       return "text-gray-600";
     case "in_progress":
       return "text-blue-600";
+    case "checking":
+      return "text-orange-600";
     case "completed":
       return "text-green-600";
     default:
       return "text-gray-600";
   }
 }
```

---

### Step 5: タブ表示修正（desktop-upper.tsx）

**ファイル:** `apps/web/components/layout/desktop-upper.tsx`

#### 5-1. activeTab型修正（行9付近）

```diff
-type TabId = "normal" | "deleted" | "todo" | "in_progress" | "completed";
+type TabId = "normal" | "deleted" | "todo" | "in_progress" | "checking" | "completed";
```

#### 5-2. Props型にcheckingCount追加

```diff
 interface DesktopUpperProps {
   activeTab: TabId;
   onTabChange: (tab: TabId) => void;
   todoCount?: number;
   inProgressCount?: number;
+  checkingCount?: number;
   completedCount?: number;
   deletedCount?: number;
```

#### 5-3. getTabsConfig関数修正（タスクモードのタブ配列）

```diff
 // タスクモード
 return [
   { id: "todo", label: "未着手", count: todoCount },
   { id: "in_progress", label: "進行中", count: inProgressCount },
+  { id: "checking", label: "確認中", count: checkingCount },
   { id: "completed", label: "完了", count: completedCount },
   { id: "deleted", label: "削除済み", count: deletedCount },
 ];
```

#### 5-4. getTabColor関数修正

```diff
 const getTabColor = (tabId: string) => {
   switch (tabId) {
     case "todo":
       return "bg-gray-400";
     case "in_progress":
       return "bg-blue-400";
+    case "checking":
+      return "bg-orange-400";
     case "completed":
       return "bg-green-400";
```

#### 5-5. getTabBackgroundClass関数修正

```diff
 const getTabBackgroundClass = (tabId: string, isActive: boolean) => {
   if (!isActive) return "";
   switch (tabId) {
     case "todo":
       return "bg-gray-100";
     case "in_progress":
       return "bg-blue-100";
+    case "checking":
+      return "bg-orange-100";
     case "completed":
       return "bg-green-100";
```

---

### Step 6: リスト表示修正（desktop-lower.tsx）

**ファイル:** `apps/web/components/layout/desktop-lower.tsx`

#### 6-1. activeTab型修正（行17付近）

```diff
-activeTab: "todo" | "in_progress" | "completed" | "deleted";
+activeTab: "todo" | "in_progress" | "checking" | "completed" | "deleted";
```

---

### Step 7: タスク画面状態管理修正（task-screen.tsx）

**ファイル:** `apps/web/components/screens/task-screen.tsx`

#### 7-1. taskStatusCountsにcheckingを追加（行964-987付近）

```diff
 const taskStatusCounts = useMemo(() => {
   if (!tasks) return { todo: 0, inProgress: 0, checking: 0, completed: 0 };
   return {
     todo: tasks.filter((t) => t.status === "todo").length,
     inProgress: tasks.filter((t) => t.status === "in_progress").length,
+    checking: tasks.filter((t) => t.status === "checking").length,
     completed: tasks.filter((t) => t.status === "completed").length,
   };
 }, [tasks]);
```

#### 7-2. DesktopUpperのpropsにcheckingCountを追加

```diff
 <DesktopUpper
   activeTab={activeTab}
   onTabChange={handleTabChange}
   todoCount={taskStatusCounts.todo}
   inProgressCount={taskStatusCounts.inProgress}
+  checkingCount={taskStatusCounts.checking}
   completedCount={taskStatusCounts.completed}
   deletedCount={deletedTasks?.length ?? 0}
```

#### 7-3. 選択状態管理にcheckingを追加（行537-575付近）

タブ切り替えロジックの`switch`文に`case "checking":`を追加

---

## 🎨 カラー設計

| ステータス | バッジ色        | テキスト色        | タブ色          |
| ---------- | --------------- | ----------------- | --------------- |
| 未着手     | `bg-gray-100`   | `text-gray-800`   | `bg-gray-400`   |
| 進行中     | `bg-blue-100`   | `text-blue-800`   | `bg-blue-400`   |
| **確認中** | `bg-orange-100` | `text-orange-800` | `bg-orange-400` |
| 完了       | `bg-green-100`  | `text-green-800`  | `bg-green-400`  |

---

## ✅ Codex用ToDoリスト

- [ ] Step 1: `apps/api/src/routes/tasks/route.ts` の3箇所のスキーマに`"checking"`を追加
- [ ] Step 2: `apps/api/src/routes/teams/tasks.ts` の3箇所のスキーマに`"checking"`を追加
- [ ] Step 3: `apps/web/src/types/task.ts` の3箇所の型に`"checking"`を追加
- [ ] Step 4: `apps/web/src/utils/taskUtils.ts` の3関数に`"checking"`ケースを追加
- [ ] Step 5: `apps/web/components/layout/desktop-upper.tsx` のタブ設定・色設定を修正
- [ ] Step 6: `apps/web/components/layout/desktop-lower.tsx` の型を修正
- [ ] Step 7: `apps/web/components/screens/task-screen.tsx` のカウント・props・選択状態を修正
- [ ] 型チェック実行: `npm run check:wsl` および `npm run check:api`

---

## ⚠️ 注意事項

- DBスキーマの変更は不要（textカラムなので新しい値を格納可能）
- マイグレーション不要
- 既存タスクには影響なし（新しいステータスは手動で設定する必要あり）

---

## 📅 最終更新日

2025-12-05
