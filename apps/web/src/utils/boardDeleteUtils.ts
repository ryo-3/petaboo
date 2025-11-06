/**
 * ボード削除機能の共通ユーティリティ関数
 *
 * 【目的】
 * - ボード詳細の削除ロジックで壊れやすい部分を共通関数化
 * - タブ判定ロジックとoriginalId検索ロジックを統一
 * - メモ一覧/タスク一覧と同じロジックを再利用可能に
 *
 * 【背景】
 * - ボード詳細は独自実装（`useBulkDeleteOperations`）を使用
 * - メモ一覧/タスク一覧は統一フック（`useBulkDeleteUnified`）を使用
 * - この差異がマージ時のバグの原因
 *
 * 【解決策】
 * - 壊れやすい部分（タブ判定、originalId検索）だけを共通化
 * - チェックボックスロジックは既存実装のまま（案3: 最小限の変更）
 */

/**
 * タブ状態から完全削除を使用すべきか判定
 *
 * @param itemType - アイテムの種類（"memo" | "task"）
 * @param activeMemoTab - メモタブの状態
 * @param activeTaskTab - タスクタブの状態
 * @returns 完全削除を使用すべき場合は true
 *
 * @example
 * // メモの削除済みタブ → 完全削除
 * shouldUsePermanentDelete("memo", "deleted", "todo") // => true
 *
 * @example
 * // メモの通常タブ → 通常削除
 * shouldUsePermanentDelete("memo", "normal", "todo") // => false
 *
 * @example
 * // タスクの削除済みタブ → 完全削除
 * shouldUsePermanentDelete("task", "normal", "deleted") // => true
 */
export function shouldUsePermanentDelete(
  itemType: "memo" | "task",
  activeMemoTab: "normal" | "deleted",
  activeTaskTab: "todo" | "in_progress" | "completed" | "deleted",
): boolean {
  if (itemType === "memo") {
    return activeMemoTab === "deleted";
  } else {
    return activeTaskTab === "deleted";
  }
}

/**
 * アイテムのoriginalIdを取得
 *
 * 【検索ロジック】
 * 1. 完全削除の場合: `boardDeletedItems` から検索
 * 2. 通常削除の場合: `boardItems` から検索
 * 3. 見つからない場合: `id.toString()` をフォールバック
 *
 * @param id - アイテムのID
 * @param itemType - アイテムの種類（"memo" | "task"）
 * @param isPermanentDelete - 完全削除かどうか
 * @param boardItems - ボード内のアイテム一覧（通常削除時に使用）
 * @param boardDeletedItems - ボード内の削除済みアイテム一覧（完全削除時に使用）
 * @returns originalId
 *
 * @example
 * // メモの完全削除
 * getItemOriginalId(123, "memo", true, boardMemos, boardDeletedItems)
 * // => boardDeletedItems.memos から id=123 を探してoriginalIdを返す
 *
 * @example
 * // タスクの通常削除
 * getItemOriginalId(456, "task", false, boardTasks, boardDeletedItems)
 * // => boardTasks から id=456 を探してoriginalIdを返す
 */
export function getItemOriginalId(
  id: number,
  itemType: "memo" | "task",
  isPermanentDelete: boolean,
  boardItems: Array<{ id: number; originalId?: string }>,
  boardDeletedItems?:
    | {
        memos?: Array<{ id: number; originalId?: string }>;
        tasks?: Array<{ id: number; originalId?: string }>;
      }
    | undefined,
): string {
  // 完全削除の場合は削除済みアイテムから検索
  if (isPermanentDelete && boardDeletedItems) {
    const deletedItems =
      itemType === "memo"
        ? boardDeletedItems.memos || []
        : boardDeletedItems.tasks || [];
    const deletedItem = deletedItems.find((item) => item.id === id);

    if (deletedItem?.originalId) {
      return deletedItem.originalId;
    }

    // 見つからない場合は警告を出してフォールバック
    console.warn(
      `⚠️ 削除済み${itemType === "memo" ? "メモ" : "タスク"}のoriginalIdが見つかりません:`,
      {
        id,
        itemType,
        deletedItemsCount: deletedItems.length,
        fallback: id.toString(),
      },
    );
    return id.toString();
  }

  // 通常削除の場合はボードアイテムから検索
  const item = boardItems.find((item) => item.id === id);

  if (item?.originalId) {
    return item.originalId;
  }

  // 見つからない場合は警告を出してフォールバック
  console.warn(
    `⚠️ ${itemType === "memo" ? "メモ" : "タスク"}のoriginalIdが見つかりません:`,
    {
      id,
      itemType,
      boardItemsCount: boardItems.length,
      fallback: id.toString(),
    },
  );
  return id.toString();
}

/**
 * ログ出力用のヘルパー関数
 *
 * @param itemType - アイテムの種類
 * @param isPermanentDelete - 完全削除かどうか
 * @param id - アイテムのID
 * @param originalId - アイテムのoriginalId
 * @param activeTab - 現在のタブ状態
 * @param context - 追加のコンテキスト情報
 */
export function logDeleteOperation(
  itemType: "memo" | "task",
  isPermanentDelete: boolean,
  id: number,
  originalId: string,
  activeTab: string,
  context?: {
    deletedItemsCount?: number;
    boardItemsCount?: number;
  },
): void {
  const emoji = isPermanentDelete ? "🗑️" : "📝";
  const operation = isPermanentDelete ? "完全削除" : "通常削除";
  const itemLabel = itemType === "memo" ? "メモ" : "タスク";

  console.log(`${emoji} ${itemLabel}${operation}:`, {
    id,
    originalId,
    activeTab,
    ...context,
  });
}
