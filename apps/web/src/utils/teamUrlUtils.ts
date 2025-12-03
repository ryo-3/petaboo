/**
 * チームページのURL解析ユーティリティ
 * URL形式の変換・解析ロジックを一元管理
 */

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
 * 形式: ?board=SLUG または ?slug=SLUG（旧形式互換）
 */
export function getBoardSlugFromParams(
  searchParams: URLSearchParams,
): string | null {
  // board= パラメータから取得（slug= は旧形式互換）
  const boardParam = searchParams.get("board") || searchParams.get("slug");
  return boardParam ? boardParam.toUpperCase() : null;
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
