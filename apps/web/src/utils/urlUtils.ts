/**
 * チーム機能でのタスクやメモの共有URL生成ユーティリティ
 */

export interface TeamUrlParams {
  teamName: string;
  tab: "tasks" | "memos";
  itemId: string | number;
}

/**
 * チームのタスク/メモ共有URLを生成する
 * ボード詳細ページから呼ばれた場合はボード情報を保持
 * 通常のチームページではdisplayIdのみを使用
 */
export function generateTeamShareUrl(params: TeamUrlParams): string {
  const { teamName, tab, itemId } = params;

  // 現在のURLがボード詳細ページかチェック
  const currentPath = window.location.pathname;
  const boardMatch = currentPath.match(/\/team\/[^/]+\/board\/(.+)/);

  if (boardMatch) {
    // ボード詳細ページの場合、ボード情報を保持
    const boardSlug = boardMatch[1];
    const baseUrl = `${window.location.origin}/team/${teamName}/board/${boardSlug}`;

    if (tab === "memos") {
      return `${baseUrl}?initialMemo=${itemId}`;
    } else if (tab === "tasks") {
      return `${baseUrl}?initialTask=${itemId}`;
    }
  }

  // 通常のチームページの場合
  const baseUrl = `${window.location.origin}/team/${teamName}`;

  // 新形式: 個別アイテム表示はパラメータに値を設定
  if (tab === "tasks") {
    return `${baseUrl}?task=${itemId}`;
  } else if (tab === "memos") {
    return `${baseUrl}?memo=${itemId}`;
  }

  return baseUrl;
}

/**
 * 現在のURLからチーム名を抽出する
 * /team/teamName や /team/teamName/board/... 両方に対応
 */
export function extractTeamNameFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const pathname = window.location.pathname;
  // /team/teamName または /team/teamName/board/... にマッチ
  const match = pathname.match(/^\/team\/([^/]+)/);
  return match?.[1] || null;
}
