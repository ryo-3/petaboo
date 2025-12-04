# PETABOO-14: 担当者一括設定のContext化リファクタリング

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

担当者一括設定（BulkAssignee）機能を `team-detail-context.tsx` に集約し、以下の画面間でのコード重複（バケツリレー）を解消する：

1. **チームタスク画面** (`task-screen.tsx`)
2. **チームボード詳細** (`board-detail-screen.tsx`)
3. **チームボード詳細3パネル** (`board-detail-screen-3panel.tsx`)

## 現状の問題点

各画面で以下のコードが重複している：

```tsx
// 状態
const [isBulkAssigneeModalOpen, setIsBulkAssigneeModalOpen] = useState(false);
const [isBulkAssigneeUpdating, setIsBulkAssigneeUpdating] = useState(false);

// フック
const updateTask = useUpdateTask({ teamMode, teamId: teamId ?? undefined });
const { data: teamDetail } = useTeamDetail(teamMode ? String(teamId) : "");
const teamMembers = teamDetail?.members || [];

// ハンドラー
const handleAssigneeTask = useCallback(() => { ... }, []);
const currentSelectedAssigneeId = useMemo(() => { ... }, [...]);
const handleBulkAssigneeUpdate = useCallback(async (assigneeId) => { ... }, [...]);

// JSX
<BulkAssigneeModal ... />
```

## 変更範囲

### 1. team-detail-context.tsx（拡張）

- 担当者一括設定用の状態・関数を追加

### 2. BulkAssigneeProvider（新規）

- `apps/web/src/contexts/bulk-assignee-context.tsx`
- 担当者モーダル専用のContext
- ※ team-detail-contextに入れると肥大化するため分離

### 3. layout.tsx（更新）

- BulkAssigneeProviderをTeamDetailProviderの内側に配置

### 4. task-screen.tsx（削減）

- 重複コードをContext呼び出しに置き換え

### 5. board-detail-screen.tsx（削減）

- 重複コードをContext呼び出しに置き換え

### 6. board-detail-screen-3panel.tsx（削減）

- 重複コードをContext呼び出しに置き換え

### 7. board-task-section.tsx（変更なし or 微修正）

- onAssigneeはそのまま維持（親から渡す形で問題なし）

---

## 実装手順

### Step 1: BulkAssigneeContext作成

**ファイル**: `apps/web/src/contexts/bulk-assignee-context.tsx`

```tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useTeamContext } from "./team-context";
import { useUpdateTask } from "@/src/hooks/use-tasks";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import BulkAssigneeModal from "@/components/ui/modals/bulk-assignee-modal";
import type { Task } from "@/src/types/task";

interface BulkAssigneeContextType {
  // モーダル開閉
  openBulkAssigneeModal: (
    checkedTaskIds: Set<number | string>,
    taskItems: Array<{ content?: Task; itemId?: string | number }>,
    onComplete: () => void,
  ) => void;
  closeBulkAssigneeModal: () => void;
  isOpen: boolean;
}

const BulkAssigneeContext = createContext<BulkAssigneeContextType | undefined>(
  undefined,
);

export function BulkAssigneeProvider({ children }: { children: ReactNode }) {
  const { isTeamMode: teamMode, teamId } = useTeamContext();

  // モーダル状態
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 選択されたタスク情報（モーダル表示時に設定）
  const [checkedTaskIds, setCheckedTaskIds] = useState<Set<number | string>>(
    new Set(),
  );
  const [taskItems, setTaskItems] = useState<
    Array<{ content?: Task; itemId?: string | number }>
  >([]);
  const [onCompleteCallback, setOnCompleteCallback] = useState<
    (() => void) | null
  >(null);

  // チームメンバー取得
  const { data: teamDetail } = useTeamDetail(teamMode ? String(teamId) : "");
  const teamMembers = teamDetail?.members || [];

  // タスク更新フック
  const updateTask = useUpdateTask({ teamMode, teamId: teamId ?? undefined });

  // 選択中タスクの現在の担当者を計算
  const currentSelectedAssigneeId = useMemo(() => {
    if (checkedTaskIds.size === 0) return undefined;

    const selectedTaskIds = Array.from(checkedTaskIds);
    const selectedTaskItems = taskItems.filter((item) => {
      const itemId = item.content?.id || item.itemId;
      return selectedTaskIds.includes(itemId as number | string);
    });

    if (selectedTaskItems.length === 0) return undefined;

    const firstAssignee = selectedTaskItems[0]?.content?.assigneeId;
    const allSame = selectedTaskItems.every(
      (item) => item.content?.assigneeId === firstAssignee,
    );

    return allSame ? firstAssignee : undefined;
  }, [checkedTaskIds, taskItems]);

  // モーダルを開く
  const openBulkAssigneeModal = useCallback(
    (
      ids: Set<number | string>,
      items: Array<{ content?: Task; itemId?: string | number }>,
      onComplete: () => void,
    ) => {
      setCheckedTaskIds(ids);
      setTaskItems(items);
      setOnCompleteCallback(() => onComplete);
      setIsOpen(true);
    },
    [],
  );

  // モーダルを閉じる
  const closeBulkAssigneeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 担当者一括更新
  const handleBulkAssigneeUpdate = useCallback(
    async (assigneeId: string | null) => {
      if (checkedTaskIds.size === 0) return;

      setIsUpdating(true);
      try {
        const taskIds = Array.from(checkedTaskIds).map((id) => {
          if (typeof id === "number") return id;
          const item = taskItems.find(
            (t) => t.itemId === id || t.content?.displayId === id,
          );
          return item?.content?.id || parseInt(String(id), 10);
        });

        const updatePromises = taskIds.map((taskId) =>
          updateTask.mutateAsync({
            id: taskId,
            data: { assigneeId },
          }),
        );
        await Promise.all(updatePromises);

        setIsOpen(false);
        onCompleteCallback?.();
      } catch (error) {
        console.error("担当者の一括設定に失敗しました:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [checkedTaskIds, taskItems, updateTask, onCompleteCallback],
  );

  return (
    <BulkAssigneeContext.Provider
      value={{
        openBulkAssigneeModal,
        closeBulkAssigneeModal,
        isOpen,
      }}
    >
      {children}
      {/* モーダルをProviderレベルで描画 */}
      {teamMode && (
        <BulkAssigneeModal
          isOpen={isOpen}
          onClose={closeBulkAssigneeModal}
          onConfirm={handleBulkAssigneeUpdate}
          members={teamMembers}
          selectedCount={checkedTaskIds.size}
          isLoading={isUpdating}
          currentAssigneeId={currentSelectedAssigneeId}
        />
      )}
    </BulkAssigneeContext.Provider>
  );
}

export function useBulkAssignee() {
  const context = useContext(BulkAssigneeContext);
  if (context === undefined) {
    throw new Error(
      "useBulkAssignee must be used within a BulkAssigneeProvider",
    );
  }
  return context;
}

// Provider外でも安全に使用できるフック
export function useBulkAssigneeSafe() {
  return useContext(BulkAssigneeContext);
}
```

### Step 2: layout.tsx更新

**ファイル**: `apps/web/app/team/[customUrl]/layout.tsx`

```diff
+ import { BulkAssigneeProvider } from "@/src/contexts/bulk-assignee-context";

  <TeamDetailProvider>
+   <BulkAssigneeProvider>
      {children}
+   </BulkAssigneeProvider>
  </TeamDetailProvider>
```

### Step 3: 各画面の重複コード削除

#### task-screen.tsx

**削除対象**:

```tsx
// 削除: import文
- import BulkAssigneeModal from "@/components/ui/modals/bulk-assignee-modal";

// 削除: 状態
- const [isBulkAssigneeModalOpen, setIsBulkAssigneeModalOpen] = useState(false);
- const [isBulkAssigneeUpdating, setIsBulkAssigneeUpdating] = useState(false);

// 削除: currentSelectedAssigneeId useMemo
// 削除: handleBulkAssigneeUpdate useCallback

// 削除: JSX
- {teamMode && (
-   <BulkAssigneeModal ... />
- )}
```

**追加**:

```tsx
// 追加: import
+ import { useBulkAssignee } from "@/src/contexts/bulk-assignee-context";

// 追加: フック呼び出し
+ const { openBulkAssigneeModal } = useBulkAssignee();

// 変更: SelectionMenuButtonのonAssignee
  onAssignee={() => {
-   setIsBulkAssigneeModalOpen(true);
+   openBulkAssigneeModal(
+     checkedTasks,
+     tasks.map(t => ({ content: t })),
+     () => setCheckedTasks(new Set())
+   );
  }}
```

#### board-detail-screen.tsx / board-detail-screen-3panel.tsx

同様の変更パターン。

---

## 影響範囲・懸念点

### 影響範囲

- チームモードのタスク画面（`/team/[customUrl]?tab=tasks`）
- チームモードのボード詳細（`/team/[customUrl]?board=SLUG`）

### 懸念点

1. **taskItems の形式差異**
   - task-screen: `Task[]`
   - board-detail-screen: `BoardItem[]`（content に Task が入る）
   - → Context側で両方対応できる型定義にする

2. **checkedTasks の型差異**
   - task-screen: `Set<number>`
   - board-detail-screen: `Set<number | string>`
   - → `Set<number | string>` で統一

3. **個人モードでの動作**
   - BulkAssigneeProviderはTeamContextの中で使用
   - 個人モードでは `useBulkAssigneeSafe()` が undefined を返す
   - → 呼び出し側でteamModeチェックしているので問題なし

---

## Codex用ToDoリスト

### 必須タスク

- [ ] `apps/web/src/contexts/bulk-assignee-context.tsx` を新規作成
- [ ] `apps/web/app/team/[customUrl]/layout.tsx` にBulkAssigneeProviderを追加
- [ ] `apps/web/components/screens/task-screen.tsx` から重複コードを削除し、Context使用に変更
- [ ] `apps/web/components/screens/board-detail-screen.tsx` から重複コードを削除し、Context使用に変更
- [ ] `apps/web/components/screens/board-detail-screen-3panel.tsx` から重複コードを削除し、Context使用に変更

### 確認タスク

- [ ] `npm run check:wsl` でビルドエラーがないことを確認
- [ ] チームタスク画面で担当者一括設定が動作することを確認
- [ ] チームボード詳細で担当者一括設定が動作することを確認

---

## 備考

- BoardTaskSectionの `onAssignee` プロップは維持（親コンポーネントから渡す形式のまま）
- Context化することで、将来的にメモの担当者設定など追加機能が必要になった場合も拡張しやすい
