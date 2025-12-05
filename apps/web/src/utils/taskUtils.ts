// ステータスのリスト/カード表示用の色（薄い背景色 + 濃いテキスト色）
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "bg-Green/70 text-gray-100 font-medium";
    case "checking":
      return "bg-orange-200 text-orange-800 font-medium";
    case "in_progress":
      return "bg-blue-200 text-gray-600 font-medium";
    default:
      return "bg-zinc-200 text-gray-600 font-medium";
  }
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
  switch (status) {
    case "completed":
      return "完了";
    case "checking":
      return "確認中";
    case "in_progress":
      return "進行中";
    default:
      return "未着手";
  }
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
  switch (status) {
    case "completed":
      return "text-green-600";
    case "checking":
      return "text-orange-600";
    case "in_progress":
      return "text-blue-600";
    default:
      return "text-gray-600";
  }
};
