type ScreenMode =
  | "home"
  | "memo"
  | "task"
  | "create"
  | "search"
  | "settings"
  | "board"
  | "welcome"
  | "team"
  | "loading";

/**
 * URLからスクリーンモードを取得する統一関数
 */
export function getModeFromUrl(
  pathname: string,
  searchParams: URLSearchParams,
): ScreenMode {
  // チームボード詳細ページ
  if (pathname.includes("/team/") && pathname.includes("/board/")) {
    return "board";
  }

  // チーム詳細ページ
  if (pathname.startsWith("/team/") && pathname !== "/team") {
    // 新形式のパラメータをチェック
    if (searchParams.has("board")) return "board";
    if (searchParams.has("memos")) return "memo";
    if (searchParams.has("tasks")) return "task";
    if (searchParams.has("boards")) return "board";
    if (searchParams.has("search")) return "search";
    if (searchParams.has("team-list")) return "team";
    if (searchParams.has("team-settings")) return "settings";

    // 旧形式のtabパラメータもチェック
    const tab = searchParams.get("tab");

    switch (tab) {
      case "memos":
        return "memo";
      case "tasks":
        return "task";
      case "board": // ボード詳細 (単数形)
      case "boards": // ボード一覧 (複数形)
        return "board";
      case "team-list":
      case "team-settings":
        return "team";
      case "settings":
        return "settings";
      case "search":
        return "search";
      case "overview":
      case null:
      default:
        return "home";
    }
  }

  // チーム一覧ページ
  if (pathname === "/team") {
    return "team";
  }

  // 通常のページ（個人モード）
  if (pathname.startsWith("/memo")) {
    return "memo";
  }
  if (pathname.startsWith("/task")) {
    return "task";
  }
  if (pathname.startsWith("/board")) {
    return "board";
  }
  if (pathname.startsWith("/settings")) {
    return "settings";
  }
  if (pathname.startsWith("/search")) {
    return "search";
  }

  // デフォルト（ホーム）
  return "home";
}

/**
 * URLからタブ情報を取得する関数
 */
export function getActiveTabFromUrl(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  // チーム詳細ページ
  if (pathname.startsWith("/team/") && pathname !== "/team") {
    // 新形式のパラメータから判定
    if (searchParams.has("board")) return "board";
    if (searchParams.has("memos")) return "memos";
    if (searchParams.has("tasks")) return "tasks";
    if (searchParams.has("boards")) return "boards";
    if (searchParams.has("search")) return "search";
    if (searchParams.has("team-list")) return "team-list";
    if (searchParams.has("team-settings")) return "team-settings";

    // 旧形式のtabパラメータもチェック
    const tab = searchParams.get("tab");
    const validTabs = [
      "memos",
      "tasks",
      "board",
      "boards",
      "team-list",
      "settings",
      "team-settings",
      "search",
    ];

    return validTabs.includes(tab || "") ? tab! : "overview";
  }

  return "overview";
}
