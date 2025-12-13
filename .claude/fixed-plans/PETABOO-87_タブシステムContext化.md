# PETABOO-87: タブシステムContext化

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → 必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 問題

タスク一覧を開くとき、「未着手」タブではなく「進行中」や「確認中」など別のタブが開かれることがある。

### 原因

`task-screen.tsx`の以下のuseEffectが問題：

```typescript
// task-screen.tsx:457-470付近
useEffect(() => {
  if (selectedTask && selectedTask.status) {
    const taskStatus = selectedTask.status;
    if (taskStatus && activeTab !== taskStatus && activeTab !== "deleted") {
      setActiveTab(taskStatus); // ← selectedTaskのstatusでタブを強制変更
    }
  }
}, [selectedTask, setActiveTab]);
```

画面遷移時に`selectedTask`がクリアされないため、前のタスクのステータスでタブが上書きされる。

### 現状のタブ管理状況

タブ状態管理が複数箇所に散らばっている：

1. **`useScreenState`** (`use-screen-state.ts`) - タスク/メモ一覧用
   - `activeTab` state（デフォルト: `"todo"` or `"normal"`）

2. **`useBoardState`** (`use-board-state.ts`) - ボード詳細用
   - `activeTaskTab` state（sessionStorageから復元）
   - `activeMemoTab` state

3. **`task-screen.tsx`** - selectedTaskに連動してタブを変更するuseEffect

## 要件

1. **タブ切り替えルール**:
   - URLにタスクIDあり → そのタスクのステータスに対応するタブ
   - URLにタスクIDなし → 「未着手(todo)」タブ
   - エディターでステータス変更 → タブ自動切り替え

2. **タスク一覧とボード詳細のタブは独立**（連動しない）

3. **将来的にユーザーがタブをカスタマイズできるようにしたい**

## 設計

### 新規作成: `TabStateContext`

```typescript
// apps/web/src/contexts/tab-state-context.tsx

export type TaskTabType =
  | "todo"
  | "in_progress"
  | "checking"
  | "completed"
  | "deleted";
export type MemoTabType = "normal" | "deleted";

interface TabStateContextType {
  // タスク一覧用
  taskListTab: TaskTabType;
  setTaskListTab: (tab: TaskTabType) => void;
  resetTaskListTab: () => void; // "todo"にリセット

  // ボード詳細用（タスク）
  boardTaskTab: TaskTabType;
  setBoardTaskTab: (tab: TaskTabType) => void;
  resetBoardTaskTab: () => void;

  // ボード詳細用（メモ）
  boardMemoTab: MemoTabType;
  setBoardMemoTab: (tab: MemoTabType) => void;
  resetBoardMemoTab: () => void;
}
```

### 変更ファイル

1. **`apps/web/src/contexts/tab-state-context.tsx`** (新規)
   - TabStateContext定義
   - TabStateProvider実装
   - useTabState hook

2. **`apps/web/app/layout.tsx`**
   - TabStateProviderを追加

3. **`apps/web/src/hooks/use-screen-state.ts`**
   - タブ関連のstate/setterを削除
   - useTabStateを使用するように変更

4. **`apps/web/src/hooks/use-board-state.ts`**
   - `activeTaskTab`, `activeMemoTab`を削除
   - sessionStorage復元ロジックを削除（Context側で管理）
   - useTabStateを使用するように変更

5. **`apps/web/components/screens/task-screen.tsx`**
   - 問題のuseEffect（selectedTask連動）を削除
   - useTabStateを使用

6. **`apps/web/components/screens/memo-screen.tsx`**
   - useTabStateを使用

7. **`apps/web/components/screens/board-detail-screen.tsx`**
   - useTabStateを使用

8. **`apps/web/components/screens/board-detail-screen-3panel.tsx`**
   - useTabStateを使用

9. **`apps/web/components/client/main-client.tsx`**
   - 画面遷移時にresetTaskListTab()を呼び出し

## 実装手順

### Step 1: TabStateContext作成

```typescript
// apps/web/src/contexts/tab-state-context.tsx
"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type TaskTabType = "todo" | "in_progress" | "checking" | "completed" | "deleted";
export type MemoTabType = "normal" | "deleted";

interface TabStateContextType {
  taskListTab: TaskTabType;
  setTaskListTab: (tab: TaskTabType) => void;
  resetTaskListTab: () => void;

  boardTaskTab: TaskTabType;
  setBoardTaskTab: (tab: TaskTabType) => void;
  resetBoardTaskTab: () => void;

  boardMemoTab: MemoTabType;
  setBoardMemoTab: (tab: MemoTabType) => void;
  resetBoardMemoTab: () => void;
}

const TabStateContext = createContext<TabStateContextType | null>(null);

export function TabStateProvider({ children }: { children: ReactNode }) {
  // タスク一覧用
  const [taskListTab, setTaskListTabState] = useState<TaskTabType>("todo");

  // ボード詳細用
  const [boardTaskTab, setBoardTaskTabState] = useState<TaskTabType>("todo");
  const [boardMemoTab, setBoardMemoTabState] = useState<MemoTabType>("normal");

  const setTaskListTab = useCallback((tab: TaskTabType) => {
    setTaskListTabState(tab);
  }, []);

  const resetTaskListTab = useCallback(() => {
    setTaskListTabState("todo");
  }, []);

  const setBoardTaskTab = useCallback((tab: TaskTabType) => {
    setBoardTaskTabState(tab);
  }, []);

  const resetBoardTaskTab = useCallback(() => {
    setBoardTaskTabState("todo");
  }, []);

  const setBoardMemoTab = useCallback((tab: MemoTabType) => {
    setBoardMemoTabState(tab);
  }, []);

  const resetBoardMemoTab = useCallback(() => {
    setBoardMemoTabState("normal");
  }, []);

  return (
    <TabStateContext.Provider
      value={{
        taskListTab,
        setTaskListTab,
        resetTaskListTab,
        boardTaskTab,
        setBoardTaskTab,
        resetBoardTaskTab,
        boardMemoTab,
        setBoardMemoTab,
        resetBoardMemoTab,
      }}
    >
      {children}
    </TabStateContext.Provider>
  );
}

export function useTabState(): TabStateContextType {
  const context = useContext(TabStateContext);
  if (!context) {
    throw new Error("useTabState must be used within TabStateProvider");
  }
  return context;
}
```

### Step 2: layout.tsxにProvider追加

```diff
// apps/web/app/layout.tsx
+ import { TabStateProvider } from "@/src/contexts/tab-state-context";

// ... contentの中で
<QueryProvider>
  <PageVisibilityProvider>
    <UserPreferencesProvider initialPreferences={initialPreferences}>
      <ViewSettingsProvider userId={1}>
        <ToastProvider>
          <HeaderControlPanelProvider>
+           <TabStateProvider>
              {clerkPublishableKey && <UserInitializer />}
              <LogCleaner />
              {children}
              <ToastContainer />
+           </TabStateProvider>
          </HeaderControlPanelProvider>
        </ToastProvider>
      </ViewSettingsProvider>
    </UserPreferencesProvider>
  </PageVisibilityProvider>
</QueryProvider>
```

### Step 3: use-screen-state.ts修正

- `activeTab`, `setActiveTab`を削除
- `screenMode`, `setScreenMode`のみ残す
- 呼び出し元で`useTabState`を使用

### Step 4: use-board-state.ts修正

- `activeTaskTab`, `activeMemoTab`関連を削除
- sessionStorage復元ロジックを削除
- 呼び出し元で`useTabState`を使用

### Step 5: task-screen.tsx修正

- 問題のuseEffect（selectedTask連動でタブ変更）を削除
- `useTabState`から`taskListTab`, `setTaskListTab`を取得
- `activeTab`を`taskListTab`に置き換え

### Step 6: main-client.tsx修正

- タスク一覧画面への遷移時に`resetTaskListTab()`を呼び出し

## 影響範囲

- タスク一覧画面
- メモ一覧画面
- 個人ボード詳細画面
- チームボード詳細画面

## 懸念点

- `useTeamContextSafe`と同様に、Provider外での使用に注意
- 既存のsessionStorage保存ロジックは一旦削除（将来的にContext側で再実装可能）

## テスト項目

1. タスク一覧を開く → 常に「未着手」タブが表示される
2. タスクを選択 → タブは変わらない
3. エディターでステータス変更 → タブが自動切り替え
4. URLにタスクIDあり → そのタスクのステータスタブが表示される
5. ボード詳細のタブは独立して動作する
