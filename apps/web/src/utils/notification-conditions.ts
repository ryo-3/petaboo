import type { IconStates } from "@/contexts/navigation-context";

export interface NotificationConditions {
  types: string[];
  teamFilter?: string;
  priority: "high" | "normal" | "low";
  interval: number;
}

/**
 * URLとiconStatesから必要な通知条件を決定
 */
export function getNotificationConditions(
  pathname: string,
  iconStates: IconStates,
  searchParams: URLSearchParams,
): NotificationConditions {
  // 1. URL基準の基本判定
  const isHomePage = pathname === "/";
  const isTeamListPage = pathname === "/team";
  const isTeamDetailPage =
    pathname.startsWith("/team/") && pathname !== "/team";
  const isMemoPage = pathname.startsWith("/memo");
  const isTaskPage = pathname.startsWith("/task");

  // 2. チーム名の抽出（チーム詳細ページの場合）
  const teamName = isTeamDetailPage ? pathname.split("/")[2] : undefined;
  const currentTab = searchParams.get("tab");

  // 3. iconStates（サイドバー状態）との組み合わせ判定
  if (
    isHomePage ||
    (isTeamDetailPage && (!currentTab || currentTab === "overview"))
  ) {
    // ホーム画面 または チーム概要画面
    if (iconStates.home) {
      return {
        types: ["team_requests", "my_requests"],
        teamFilter: teamName, // チーム詳細の場合は特定チーム限定
        priority: "high",
        interval: 3000,
      };
    }
  }

  if (
    (iconStates.memo && isMemoPage) ||
    (isTeamDetailPage && currentTab === "memos")
  ) {
    // メモ画面 または チームメモタブ
    return {
      types: ["memo_mentions", "memo_updates"],
      teamFilter: teamName,
      priority: "normal",
      interval: 5000,
    };
  }

  if (
    (iconStates.task && isTaskPage) ||
    (isTeamDetailPage && currentTab === "tasks")
  ) {
    // タスク画面 または チームタスクタブ
    return {
      types: ["task_updates", "task_deadlines"],
      teamFilter: teamName,
      priority: "normal",
      interval: 5000,
    };
  }

  if (iconStates.board || (isTeamDetailPage && currentTab === "boards")) {
    // ボード画面 または チームボードタブ
    return {
      types: ["board_updates"],
      teamFilter: teamName,
      priority: "normal",
      interval: 3000, // ボードは少し頻繁にチェック
    };
  }

  if (isTeamListPage || iconStates.team) {
    // チーム一覧画面
    return {
      types: ["team_requests", "my_requests"],
      priority: "high",
      interval: 3000,
    };
  }

  // デフォルト（最小限）
  return {
    types: ["my_requests"], // 自分関連のみ
    priority: "low",
    interval: 10000, // 10秒間隔
  };
}

/**
 * 通知タイプをAPI用パラメータに変換
 */
export function getApiEndpointAndParams(conditions: NotificationConditions): {
  endpoint: string;
  params: Record<string, string>;
} {
  // 現在はチーム関連のみ実装
  if (
    conditions.types.some(
      (type) => type.startsWith("team_") || type === "my_requests",
    )
  ) {
    return {
      endpoint: "/teams/notifications/check",
      params: {
        types: conditions.types.join(","),
        ...(conditions.teamFilter && { teamFilter: conditions.teamFilter }),
      },
    };
  }

  // 将来の拡張用
  if (conditions.types.some((type) => type.startsWith("memo_"))) {
    return {
      endpoint: "/memos/notifications/check", // 未実装
      params: {
        types: conditions.types.join(","),
      },
    };
  }

  // デフォルトはチーム関連
  return {
    endpoint: "/teams/notifications/check",
    params: {
      types: "my_requests",
    },
  };
}
