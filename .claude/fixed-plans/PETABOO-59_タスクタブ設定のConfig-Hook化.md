# PETABOO-59: タスクタブ設定のConfig/Hook化

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## ステータス: 📋 計画中

## 関連タスク

- https://petaboo.vercel.app/team/moricrew?board=PETABOO&task=59
- 基盤タスク: PETABOO-9（ユーザーごとのタブカスタマイズ）

---

## 目標

```
タブの追加・削除・編集を1箇所で管理できるようにする
将来的にユーザーごとのタブカスタマイズを可能にする基盤づくり
```

---

## 現状分析

### タブ定義が散らばっている箇所（5箇所以上）

| ファイル                          | 内容                                                           | 問題点       |
| --------------------------------- | -------------------------------------------------------------- | ------------ |
| `types/task.ts:6`                 | `status: "todo" \| "in_progress" \| "checking" \| "completed"` | 型のみ       |
| `use-board-state.ts:24`           | `activeTaskTab` の型定義（+ `"deleted"`）                      | 重複定義     |
| `boardDeleteUtils.ts:42`          | `activeTaskTab` の型（同じ）                                   | 重複定義     |
| `taskUtils.ts:27-37`              | `getStatusText()` でラベル定義                                 | ラベルが分散 |
| `task-status-display.tsx:253-261` | `getEmptyMessage()` でラベル定義                               | ラベルが分散 |

### タブ関連のロジック

| ファイル             | 役割                                             |
| -------------------- | ------------------------------------------------ |
| `use-board-state.ts` | `activeTaskTab` 状態管理 + `handleTaskTabChange` |
| `use-tab-change.ts`  | タブ切り替え時の選択状態クリア（汎用）           |
| `use-board-items.ts` | `activeTaskTab` でフィルタリング                 |

### 使用箇所（UI）

- `board-task-section.tsx`
- `board-detail-screen.tsx`
- `board-detail-screen-3panel.tsx`
- `task-screen.tsx`
- `memo-screen.tsx`（メモタブの参考）

---

## 設計

### 1. タブ設定ファイル（新規）

**ファイル:** `apps/web/src/config/taskTabConfig.ts`

```typescript
// タスクステータス（DBに保存される値）
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "checking",
  "completed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// タブタイプ（ステータス + 特殊タブ）
export const TASK_TAB_TYPES = [...TASK_STATUSES, "deleted"] as const;
export type TaskTabType = (typeof TASK_TAB_TYPES)[number];

// タブ定義（将来のプリセット追加に対応できる設計）
export interface TaskTabConfig {
  id: string; // "todo" | "overdue" | 将来のカスタムID
  label: string;
  emptyMessage: string;
  color: string; // Tailwindクラス
  textColor: string; // テキスト色

  // タブの種類
  category: "status" | "special" | "custom"; // status=ステータス連動, special=削除済み等, custom=将来のプリセット

  // 将来のプリセット追加用（今は実装しない）
  filter?: (task: Task) => boolean; // カスタムフィルター条件
  defaultVisible?: boolean; // デフォルト表示/非表示（ユーザー設定用）
  order?: number; // 表示順（ユーザー設定用）
}

export const TASK_TABS: TaskTabConfig[] = [
  // ステータス連動タブ（基本）
  {
    id: "todo",
    label: "未着手",
    emptyMessage: "未着手のタスクがありません",
    color: "bg-zinc-200",
    textColor: "text-gray-600",
    category: "status",
  },
  {
    id: "in_progress",
    label: "進行中",
    emptyMessage: "進行中のタスクがありません",
    color: "bg-blue-200",
    textColor: "text-gray-600",
    category: "status",
  },
  {
    id: "checking",
    label: "確認中",
    emptyMessage: "確認中のタスクがありません",
    color: "bg-orange-200",
    textColor: "text-orange-800",
    category: "status",
  },
  {
    id: "completed",
    label: "完了",
    emptyMessage: "完了したタスクがありません",
    color: "bg-Green/70",
    textColor: "text-gray-100",
    category: "status",
  },
  // 特殊タブ
  {
    id: "deleted",
    label: "削除済み",
    emptyMessage: "削除済みタスクはありません",
    color: "bg-gray-400",
    textColor: "text-gray-100",
    category: "special",
  },
  // 将来のプリセット例（今はコメントアウト）
  // {
  //   id: "overdue",
  //   label: "期限超過",
  //   emptyMessage: "期限超過のタスクはありません",
  //   color: "bg-red-200",
  //   textColor: "text-red-800",
  //   category: "custom",
  //   filter: (task) => task.dueDate && task.dueDate < Date.now() / 1000,
  //   defaultVisible: false,
  // },
  // {
  //   id: "high_priority",
  //   label: "高優先度",
  //   emptyMessage: "高優先度のタスクはありません",
  //   color: "bg-red-500",
  //   textColor: "text-white",
  //   category: "custom",
  //   filter: (task) => task.priority === "high",
  //   defaultVisible: false,
  // },
];

// ヘルパー関数
export const getTaskTab = (id: TaskTabType): TaskTabConfig | undefined =>
  TASK_TABS.find((tab) => tab.id === id);

export const getTaskTabLabel = (id: TaskTabType): string =>
  getTaskTab(id)?.label ?? id;

export const getTaskTabEmptyMessage = (id: TaskTabType): string =>
  getTaskTab(id)?.emptyMessage ?? "タスクがありません";

export const getTaskStatusColor = (status: TaskStatus): string =>
  getTaskTab(status)?.color ?? "bg-zinc-200";

// カテゴリ別取得
export const getStatusTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.category === "status");

export const getSpecialTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.category === "special");

export const getCustomTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.category === "custom");

// 表示用タブ一覧（将来: ユーザー設定でフィルタ/並び替え）
export const getVisibleTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.defaultVisible !== false);
```

### 2. タブ用Hook（新規）

**ファイル:** `apps/web/src/hooks/use-task-tabs.ts`

```typescript
import { useState, useCallback, useMemo } from "react";
import {
  TASK_TABS,
  TaskTabType,
  getTaskTab,
  getStatusTabs,
} from "@/src/config/taskTabConfig";

interface UseTaskTabsOptions {
  defaultTab?: TaskTabType;
  includeDeleted?: boolean;
  onTabChange?: (tab: TaskTabType) => void;
}

export function useTaskTabs({
  defaultTab = "todo",
  includeDeleted = true,
  onTabChange,
}: UseTaskTabsOptions = {}) {
  const [activeTab, setActiveTabInternal] = useState<TaskTabType>(defaultTab);

  const setActiveTab = useCallback(
    (tab: TaskTabType) => {
      setActiveTabInternal(tab);
      onTabChange?.(tab);
    },
    [onTabChange],
  );

  // 利用可能なタブ一覧
  const availableTabs = useMemo(() => {
    if (includeDeleted) {
      return TASK_TABS;
    }
    return getStatusTabs();
  }, [includeDeleted]);

  // 現在のタブ情報
  const currentTab = useMemo(() => getTaskTab(activeTab), [activeTab]);

  // タブがステータスかどうか
  const isStatusTab = useMemo(() => !currentTab?.isSpecial, [currentTab]);

  // 削除済みタブかどうか
  const isDeletedTab = useMemo(() => activeTab === "deleted", [activeTab]);

  return {
    activeTab,
    setActiveTab,
    availableTabs,
    currentTab,
    isStatusTab,
    isDeletedTab,
  };
}
```

---

## 修正範囲

### Phase 1: Config/Hook作成

| ファイル                      | 操作 | 内容             |
| ----------------------------- | ---- | ---------------- |
| `src/config/taskTabConfig.ts` | 新規 | タブ定義の集約   |
| `src/hooks/use-task-tabs.ts`  | 新規 | タブロジック統一 |

### Phase 2: 既存ファイルのリファクタリング

| ファイル                  | 変更内容                                                   |
| ------------------------- | ---------------------------------------------------------- |
| `types/task.ts`           | `TaskStatus` を config から re-export                      |
| `taskUtils.ts`            | `getStatusText()`, `getStatusColor()` を config 使用に変更 |
| `use-board-state.ts`      | `TaskTabType` を config から import                        |
| `boardDeleteUtils.ts`     | `TaskTabType` を config から import                        |
| `task-status-display.tsx` | `getEmptyMessage()` を config 使用に変更                   |

### Phase 3: UI連携（任意）

| ファイル                 | 変更内容                         |
| ------------------------ | -------------------------------- |
| `board-task-section.tsx` | `useTaskTabs` 使用を検討         |
| タブUI表示部分           | `TASK_TABS` からループ生成を検討 |

---

## 実装手順

### Step 1: Config作成

1. [ ] `src/config/taskTabConfig.ts` を新規作成
2. [ ] 型定義（`TaskStatus`, `TaskTabType`, `TaskTabConfig`）
3. [ ] `TASK_TABS` 配列定義
4. [ ] ヘルパー関数作成

### Step 2: Hook作成

1. [ ] `src/hooks/use-task-tabs.ts` を新規作成
2. [ ] 状態管理（`activeTab`, `setActiveTab`）
3. [ ] 派生値（`availableTabs`, `currentTab`, `isDeletedTab`）

### Step 3: 既存コードのリファクタリング

1. [ ] `types/task.ts` - `TaskStatus` を config から re-export
2. [ ] `taskUtils.ts` - config を使用するように変更
3. [ ] `use-board-state.ts` - 型を config から import
4. [ ] `boardDeleteUtils.ts` - 型を config から import
5. [ ] `task-status-display.tsx` - `getEmptyMessage()` を config 使用

### Step 4: 動作確認

1. [ ] `npm run check:wsl` 通過
2. [ ] タスク画面でタブ切り替え動作確認
3. [ ] ボード詳細画面でタブ切り替え動作確認

---

## 期待される効果

| 項目               | Before         | After            |
| ------------------ | -------------- | ---------------- |
| タブ定義箇所       | 5箇所以上      | 1箇所（config）  |
| タブ追加時の変更   | 5ファイル以上  | 1ファイル        |
| ラベル・色の一貫性 | 手動で合わせる | 自動的に統一     |
| 将来のカスタマイズ | 困難           | config拡張で可能 |

---

## 将来の拡張（PETABOO-9 基盤）

### 設計思想

```
「ユーザーが自由に作成」ではなく「プリセットから選んで表示/非表示」方式

理由:
- ユーザー作成はUI複雑、バグりやすい、サポートコスト高
- プリセット方式ならテスト済みの安定したタブを提供できる
- 後から人気のプリセットを追加できる
```

### プリセット追加の流れ（将来）

```typescript
// 1. TASK_TABS に新しいプリセットを追加
{
  id: "overdue",
  label: "期限超過",
  emptyMessage: "期限超過のタスクはありません",
  color: "bg-red-200",
  textColor: "text-red-800",
  category: "custom",
  filter: (task) => task.dueDate && task.dueDate < Date.now() / 1000,
  defaultVisible: false,  // デフォルトは非表示
}

// 2. ユーザー設定（ローカルストレージ or DB）
interface UserTabSettings {
  userId: string;
  tabs: {
    tabId: string;
    visible: boolean;
    order: number;
  }[];
}

// 3. useTaskTabs で設定を反映
const { visibleTabs } = useTaskTabs({ userSettings });
```

### 想定プリセット一覧

| ID            | ラベル     | フィルター条件           | デフォルト      |
| ------------- | ---------- | ------------------------ | --------------- |
| todo          | 未着手     | status === "todo"        | ON              |
| in_progress   | 進行中     | status === "in_progress" | ON              |
| checking      | 確認中     | status === "checking"    | ON              |
| completed     | 完了       | status === "completed"   | ON              |
| deleted       | 削除済み   | 削除済みテーブル         | ON              |
| overdue       | 期限超過   | dueDate < now            | OFF             |
| due_today     | 今日が期限 | dueDate === today        | OFF             |
| high_priority | 高優先度   | priority === "high"      | OFF             |
| draft         | 下書き     | isDraft === true         | OFF             |
| my_tasks      | 自分が担当 | assigneeId === me        | OFF（チーム用） |

---

## 注意事項

1. **後方互換性**: 既存の型定義を破壊しない（re-exportで対応）
2. **段階的移行**: 一度にすべて変更せず、Phase単位で確認
3. **テスト**: 各Phase後に手動で動作確認

---

## Codex用ToDoリスト

```
Phase 1:
- [ ] apps/web/src/config/taskTabConfig.ts を新規作成（上記コード）
- [ ] apps/web/src/hooks/use-task-tabs.ts を新規作成（上記コード）

Phase 2:
- [ ] types/task.ts で TaskStatus を config から re-export
- [ ] taskUtils.ts の getStatusText() を config 使用に変更
- [ ] use-board-state.ts の型定義を config から import
- [ ] boardDeleteUtils.ts の型定義を config から import
- [ ] task-status-display.tsx の getEmptyMessage() を config 使用

Phase 3（任意）:
- [ ] board-task-section.tsx のタブUI表示を TASK_TABS からループ生成に変更
```
