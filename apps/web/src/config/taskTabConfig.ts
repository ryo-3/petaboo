export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "checking",
  "completed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_TAB_TYPES = [...TASK_STATUSES, "deleted"] as const;
export type TaskTabType = (typeof TASK_TAB_TYPES)[number];

// 文字列がTaskTabTypeか判定（フィルタやフォールバック用）
export const isTaskTabType = (value: string): value is TaskTabType =>
  (TASK_TAB_TYPES as readonly string[]).includes(value as TaskTabType);

export interface TaskTabConfig {
  id: string; // タブID（status/special/customでユニーク）
  label: string;
  emptyMessage: string;
  color: string; // 背景色クラス
  textColor: string; // テキスト色クラス
  category: "status" | "special" | "custom";
  filter?: (task: {
    status?: string;
    priority?: string;
    dueDate?: number | null;
  }) => boolean;
  defaultVisible?: boolean;
  order?: number;
}

export const TASK_TABS: TaskTabConfig[] = [
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
  {
    id: "deleted",
    label: "削除済み",
    emptyMessage: "削除済みタスクはありません",
    color: "bg-gray-400",
    textColor: "text-gray-100",
    category: "special",
  },
];

export const getTaskTab = (id: string): TaskTabConfig | undefined =>
  TASK_TABS.find((tab) => tab.id === id);

export const getTaskTabLabel = (id: string): string =>
  getTaskTab(id)?.label ?? id;

export const getTaskTabEmptyMessage = (id: string): string =>
  getTaskTab(id)?.emptyMessage ?? "タスクがありません";

export const getTaskStatusColor = (status: string): string =>
  getTaskTab(status)?.color ?? "bg-zinc-200";

export const getStatusTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.category === "status");

export const getSpecialTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.category === "special");

export const getCustomTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.category === "custom");

export const getVisibleTabs = (): TaskTabConfig[] =>
  TASK_TABS.filter((tab) => tab.defaultVisible !== false);
