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

  const { targetType, targetOriginalId, boardOriginalId } = notification;

  if (!targetType || !targetOriginalId) {
    return `/team/${teamName}`;
  }

  // boardOriginalIdがない場合はチームホームに戻る
  if (!boardOriginalId) {
    return `/team/${teamName}`;
  }

  const baseUrl = new URL(`/team/${teamName}`, "http://example.com");
  baseUrl.searchParams.set("tab", "board");

  if (boardOriginalId) {
    baseUrl.searchParams.set("slug", boardOriginalId);
    if (/^\d+$/.test(boardOriginalId)) {
      baseUrl.searchParams.set("boardId", boardOriginalId);
    }
  }

  // ターゲット種別ごとのクエリ付与
  if (targetType === "memo" && targetOriginalId) {
    baseUrl.searchParams.set("memo", targetOriginalId);
  } else if (targetType === "task" && targetOriginalId) {
    baseUrl.searchParams.set("task", targetOriginalId);
  }

  return `${baseUrl.pathname}${baseUrl.search}`;
}
