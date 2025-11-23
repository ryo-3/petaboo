import type { Notification } from "@/lib/api/notifications";

/**
 * 通知から適切な遷移先URLを生成する
 * @param notification 通知オブジェクト
 * @param teamName チームのカスタムURL
 * @returns 遷移先URL、または生成できない場合はnull
 */
export function getNotificationUrl(
  notification: Notification,
  teamName: string | null | undefined,
): string | null {
  if (!teamName) return null;

  const { targetType, targetDisplayId, boardDisplayId } = notification;

  if (!targetType || !targetDisplayId) {
    return `/team/${teamName}`;
  }

  // boardDisplayIdがない場合はチームホームに戻る
  if (!boardDisplayId) {
    return `/team/${teamName}`;
  }

  const baseUrl = new URL(`/team/${teamName}`, "http://example.com");
  baseUrl.searchParams.set("tab", "board");

  if (boardDisplayId) {
    baseUrl.searchParams.set("slug", boardDisplayId);
    if (/^\d+$/.test(boardDisplayId)) {
      baseUrl.searchParams.set("boardId", boardDisplayId);
    }
  }

  // ターゲット種別ごとのクエリ付与
  if (targetType === "memo" && targetDisplayId) {
    baseUrl.searchParams.set("memo", targetDisplayId);
  } else if (targetType === "task" && targetDisplayId) {
    baseUrl.searchParams.set("task", targetDisplayId);
  }

  return `${baseUrl.pathname}${baseUrl.search}`;
}
