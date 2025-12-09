import {
  TASK_TAB_TYPES,
  getTaskStatusColor,
  getTaskTab,
  getTaskTabLabel,
  type TaskTabType,
} from "@/src/config/taskTabConfig";

const isTaskTabType = (value: string): value is TaskTabType =>
  (TASK_TAB_TYPES as readonly string[]).includes(value as TaskTabType);

// ステータスのリスト/カード表示用の色（薄い背景色 + 濃いテキスト色）
export const getStatusColor = (status: string): string => {
  const tabId = isTaskTabType(status) ? status : null;
  const tab = tabId ? getTaskTab(tabId) : undefined;
  return tab
    ? `${tab.color} ${tab.textColor} font-medium`
    : "bg-zinc-200 text-gray-600 font-medium";
};

// 優先度のリスト/カード表示用の色（濃い背景色 + 薄いテキスト色）
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "high":
      return "bg-red-500 text-gray-100 ";
    case "medium":
      return "bg-yellow-500 text-white";
    default:
      return "bg-gray-500 text-gray-100";
  }
};

export const getStatusText = (status: string): string => {
  const tabId = isTaskTabType(status) ? status : null;
  const label = tabId ? getTaskTabLabel(tabId) : null;
  return label ?? "未着手";
};

export const getPriorityText = (priority: string): string => {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    default:
      return "低";
  }
};

// 優先度の○アイコン色（インジケーター・エディター共通）
export const getPriorityBackgroundColor = (priority: string): string => {
  switch (priority) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
};

// 優先度のインジケーター（丸）用の色（互換性のため残す）
export const getPriorityIndicatorClass = (priority: string): string => {
  return getPriorityBackgroundColor(priority);
};

// 優先度のエディター（セレクター）用の色（互換性のため残す）
export const getPriorityEditorColor = (priority: string): string => {
  return getPriorityBackgroundColor(priority);
};

// ステータスのエディター（セレクター）用の色
export const getStatusEditorColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "bg-Green"; // カスタムカラー
    case "checking":
      return "bg-orange-500";
    case "in_progress":
      return "bg-blue-600";
    default: // todo
      return "bg-gray-400";
  }
};

// カテゴリーのエディター（セレクター）用の色
export const getCategoryEditorColor = (category: string): string => {
  switch (category) {
    case "work":
      return "bg-blue-500";
    case "personal":
      return "bg-purple-500";
    case "study":
      return "bg-indigo-500";
    case "health":
      return "bg-pink-500";
    case "hobby":
      return "bg-orange-500";
    default: // 未選択
      return "bg-gray-400";
  }
};

// テキストのみの色（モバイル版等で使用）
export const getStatusColorForText = (status: string): string => {
  const tabId = isTaskTabType(status) ? status : null;
  const tab = tabId ? getTaskTab(tabId) : undefined;
  if (tab?.textColor) return tab.textColor;
  const backgroundClass = getTaskStatusColor(status);
  // 背景色がテキスト系の場合はそのまま返す、それ以外はデフォルト
  return backgroundClass.startsWith("text-")
    ? backgroundClass
    : "text-gray-600";
};
