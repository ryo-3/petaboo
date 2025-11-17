/**
 * 未保存変更ガードシステムの型定義
 */

/**
 * アイテムタイプ（memo/task/board）
 */
export type ItemType = "memo" | "task" | "board";

/**
 * 未保存変更チェック用のRef型
 */
export interface UnsavedChangesRefs {
  /** 未保存の変更があるかどうかをチェックする関数への参照 */
  hasUnsavedChangesRef: React.MutableRefObject<boolean>;
  /** 確認モーダルを表示する関数への参照 */
  showConfirmModalRef: React.MutableRefObject<(() => void) | null>;
}

/**
 * 未保存変更ガード用のイベント名
 */
export const UNSAVED_CHANGES_EVENT = {
  MEMO_DISCARDED: "memo-unsaved-changes-discarded",
  TASK_DISCARDED: "task-unsaved-changes-discarded",
  BOARD_DISCARDED: "board-unsaved-changes-discarded",
} as const;

/**
 * アイテムタイプに対応するイベント名を取得
 */
export function getDiscardEventName(itemType: ItemType): string {
  switch (itemType) {
    case "memo":
      return UNSAVED_CHANGES_EVENT.MEMO_DISCARDED;
    case "task":
      return UNSAVED_CHANGES_EVENT.TASK_DISCARDED;
    case "board":
      return UNSAVED_CHANGES_EVENT.BOARD_DISCARDED;
  }
}

/**
 * 未保存変更破棄イベントを発行
 */
export function dispatchDiscardEvent(itemType: ItemType): void {
  const eventName = getDiscardEventName(itemType);
  window.dispatchEvent(new CustomEvent(eventName));
}
