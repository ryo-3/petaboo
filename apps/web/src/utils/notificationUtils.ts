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

  // ボードへのコメント
  if (targetType === "board") {
    return `/team/${teamName}/board/${boardOriginalId}`;
  }

  // メモへのコメント - ボード画面でそのメモを開く
  if (targetType === "memo") {
    return `/team/${teamName}/board/${boardOriginalId}?memo=${targetOriginalId}`;
  }

  // タスクへのコメント - ボード画面でそのタスクを開く
  if (targetType === "task") {
    return `/team/${teamName}/board/${boardOriginalId}?task=${targetOriginalId}`;
  }

  return `/team/${teamName}`;
}
