import { useState, useCallback } from "react";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import {
  getMemoDisplayOrder,
  getTaskDisplayOrder,
  getNextItemAfterDeletion,
} from "@/src/utils/domUtils";

type ScreenMode = "list" | "view" | "create";
type ItemType = "memo" | "task";

interface UseItemDeleteWithNextSelectionProps<T> {
  items: T[] | undefined;
  onSelectItem: (item: T | null) => void;
  setScreenMode?: (mode: ScreenMode) => void; // ボード詳細では不要
  onDeselectAndStayOnList?: () => void;
  handleRightEditorDelete: (item: T) => void;
  setIsRightLidOpen?: (open: boolean) => void; // ボード詳細では不要
  itemType: ItemType;
}

export function useItemDeleteWithNextSelection<T extends { id: number }>({
  items,
  onSelectItem,
  setScreenMode,
  onDeselectAndStayOnList,
  handleRightEditorDelete,
  setIsRightLidOpen,
  itemType,
}: UseItemDeleteWithNextSelectionProps<T>) {
  // 削除後に選択する次のアイテムを保存
  const [nextItemAfterDelete, setNextItemAfterDelete] = useState<T | null>(
    null,
  );
  // 削除中のアイテムIDを追跡
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  // DOM削除確認付きの削除処理
  const handleDeleteWithNextSelection = useCallback(
    (selectedItem: T) => {
      if (!items) return;

      // DOM表示順を取得（アイテムタイプに応じて）
      const displayOrder =
        itemType === "memo" ? getMemoDisplayOrder() : getTaskDisplayOrder();

      // 削除前に次のアイテムを計算（DOM表示順で）
      const nextItem = getNextItemAfterDeletion(
        items,
        selectedItem,
        displayOrder,
      );

      // 次選択を保存（削除完了後に使用）
      setNextItemAfterDelete(nextItem);
      setDeletingItemId(selectedItem.id); // 削除中フラグ

      // 蓋を開いて即座に削除実行（ボード詳細では蓋なし）
      setIsRightLidOpen?.(true);
      handleRightEditorDelete(selectedItem);
    },
    [items, handleRightEditorDelete, setIsRightLidOpen, itemType],
  );

  // DOM削除確認処理
  const checkDomDeletionAndSelectNext = useCallback(() => {
    if (
      !deletingItemId ||
      !items ||
      items.find((item) => item.id === deletingItemId)
    ) {
      return;
    }

    // データ削除を検知、DOM削除を確認してから次選択

    let checkCount = 0;
    const maxChecks = 30; // 最大3秒待つ（100ms × 30）

    const checkDomAndSelect = () => {
      checkCount++;

      // DOMから削除されたアイテムが消えたか確認
      const dataAttribute =
        itemType === "memo" ? "data-memo-id" : "data-task-id";
      const element = document.querySelector(
        `[${dataAttribute}="${deletingItemId}"]`,
      );

      if (!element) {
        // DOM削除確認！即座に次選択

        if (nextItemAfterDelete) {
          onSelectItem(nextItemAfterDelete);
          setScreenMode?.("view");
        } else {
          setScreenMode?.("list");
          onDeselectAndStayOnList?.();
        }

        // リセット
        setDeletingItemId(null);
        setNextItemAfterDelete(null);

        // 蓋を閉じる（ボード詳細では蓋なし）
        setTimeout(() => {
          setIsRightLidOpen?.(false);
        }, 200);
      } else if (checkCount < maxChecks) {
        // まだDOMに存在する場合は再チェック
        setTimeout(checkDomAndSelect, 100);
      } else {
        // タイムアウト：強制的に次選択

        if (nextItemAfterDelete) {
          onSelectItem(nextItemAfterDelete);
          setScreenMode?.("view");
        } else {
          setScreenMode?.("list");
          onDeselectAndStayOnList?.();
        }

        // リセット
        setDeletingItemId(null);
        setNextItemAfterDelete(null);

        // 蓋を閉じる（ボード詳細では蓋なし）
        setTimeout(() => {
          setIsRightLidOpen?.(false);
        }, 200);
      }
    };

    // 最初のチェックを少し遅らせる（React更新サイクル待ち）
    requestAnimationFrame(() => {
      checkDomAndSelect();
    });
  }, [
    deletingItemId,
    items,
    nextItemAfterDelete,
    onSelectItem,
    setScreenMode,
    onDeselectAndStayOnList,
    setIsRightLidOpen,
    itemType,
  ]);

  return {
    handleDeleteWithNextSelection,
    checkDomDeletionAndSelectNext,
    deletingItemId,
    nextItemAfterDelete,
  };
}

// メモ用の便利なエクスポート（既存コードとの互換性のため）
export function useMemoDeleteWithNextSelection(props: {
  memos: Memo[] | undefined;
  onSelectMemo: (memo: Memo | null) => void;
  setMemoScreenMode?: (mode: ScreenMode) => void;
  onDeselectAndStayOnMemoList?: () => void;
  handleRightEditorDelete: (memo: Memo) => void;
  setIsRightLidOpen?: (open: boolean) => void;
}) {
  return useItemDeleteWithNextSelection({
    items: props.memos,
    onSelectItem: props.onSelectMemo,
    setScreenMode: props.setMemoScreenMode,
    onDeselectAndStayOnList: props.onDeselectAndStayOnMemoList,
    handleRightEditorDelete: props.handleRightEditorDelete,
    setIsRightLidOpen: props.setIsRightLidOpen,
    itemType: "memo" as const,
  });
}

// タスク用のエクスポート
export function useTaskDeleteWithNextSelection(props: {
  tasks: Task[] | undefined;
  onSelectTask: (task: Task | null) => void;
  setTaskScreenMode?: (mode: ScreenMode) => void;
  onDeselectAndStayOnTaskList?: () => void;
  handleRightEditorDelete: (task: Task) => void;
  setIsRightLidOpen?: (open: boolean) => void;
}) {
  return useItemDeleteWithNextSelection({
    items: props.tasks,
    onSelectItem: props.onSelectTask,
    setScreenMode: props.setTaskScreenMode,
    onDeselectAndStayOnList: props.onDeselectAndStayOnTaskList,
    handleRightEditorDelete: props.handleRightEditorDelete,
    setIsRightLidOpen: props.setIsRightLidOpen,
    itemType: "task" as const,
  });
}
