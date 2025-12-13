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

  const { boardDisplayId } = notification;

  // boardDisplayIdにはURLクエリが保存されている（例: "board=FFFF&task=4"）
  if (boardDisplayId) {
    return `/team/${teamName}?${boardDisplayId}`;
  }

  // フォールバック: チームホーム
  return `/team/${teamName}`;
}
