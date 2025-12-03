/**
 * チームページのURL解析ユーティリティ
 * URL形式の変換・解析ロジックを一元管理
 */

// 新形式で使用されるパラメータキー（これらは値なしパラメータとして扱われる）
const RESERVED_KEYS = [
  "boards",
  "memo",
  "task",
  "search",
  "team-list",
  "team-settings",
  "memos", // 旧形式互換
  "tasks", // 旧形式互換
] as const;

export type TeamTab =
  | "overview"
  | "memos"
  | "tasks"
  | "boards"
  | "board"
  | "team-list"
  | "team-settings"
  | "search";

/**
 * URLパラメータからボードslugを取得
 * 新形式: ?PETABOO (値なしキー)
 * 旧形式: ?board=xxx または ?slug=xxx
 */
export function getBoardSlugFromParams(
  searchParams: URLSearchParams,
): string | null {
  // 新形式: 値が空のキー（予約語以外）をボードslugとして扱う
  for (const [key, value] of searchParams.entries()) {
    if (
      value === "" &&
      !RESERVED_KEYS.includes(key as (typeof RESERVED_KEYS)[number])
    ) {
      return key.toUpperCase();
    }
  }
  // 旧形式
  return searchParams.get("board") || searchParams.get("slug");
}

/**
 * URLパラメータからアクティブタブを取得
 */
export function getTabFromParams(searchParams: URLSearchParams): TeamTab {
  // ボード詳細チェック
  const boardSlug = getBoardSlugFromParams(searchParams);
  if (boardSlug) {
    return "board";
  }

  // 新形式パラメータ
  if (searchParams.has("memo")) return "memos";
  if (searchParams.has("task")) return "tasks";
  if (searchParams.has("boards")) return "boards";
  if (searchParams.has("search")) return "search";
  if (searchParams.has("team-list")) return "team-list";
  if (searchParams.has("team-settings")) return "team-settings";

  // 旧形式互換（?memos, ?tasks）
  if (searchParams.has("memos")) return "memos";
  if (searchParams.has("tasks")) return "tasks";

  // 旧形式互換（?tab=xxx）
  const tab = searchParams.get("tab");
  if (tab === "settings") return "team-settings";
  if (
    tab === "memos" ||
    tab === "tasks" ||
    tab === "boards" ||
    tab === "board" ||
    tab === "team-list" ||
    tab === "team-settings" ||
    tab === "search"
  ) {
    return tab;
  }

  // デフォルト
  return "overview";
}

/**
 * URLパラメータからメモIDを取得
 */
export function getMemoIdFromParams(
  searchParams: URLSearchParams,
): string | null {
  return searchParams.get("memo");
}

/**
 * URLパラメータからタスクIDを取得
 */
export function getTaskIdFromParams(
  searchParams: URLSearchParams,
): string | null {
  return searchParams.get("task");
}
