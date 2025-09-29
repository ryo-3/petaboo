import { useCallback, useMemo } from "react";
import {
  useAddItemToBoard,
  useRemoveItemFromBoard,
  useBoardWithItems,
  useBoardDeletedItems,
} from "@/src/hooks/use-boards";
import { useExport } from "@/src/hooks/use-export";
import {
  getNextItemAfterDeletion,
  getMemoDisplayOrder,
  getTaskDisplayOrder,
} from "@/src/utils/domUtils";
import { useDeletedItemOperations } from "@/src/hooks/use-deleted-item-operations";
import { BoardItemWithContent, BoardWithItems } from "@/src/types/board";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";

interface UseBoardOperationsProps {
  boardId: number;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
  onSelectMemo?: (memo: Memo | DeletedMemo | null) => void;
  onSelectTask?: (task: Task | DeletedTask | null) => void;
  onClearSelection?: () => void;
  setRightPanelMode: (
    mode: "editor" | "memo-list" | "task-list" | null,
  ) => void;
  createNewMemoHandler: (
    callback: ((memo: Memo | DeletedMemo | null) => void) | undefined,
  ) => void;
  createNewTaskHandler: (
    callback: ((task: Task | DeletedTask | null) => void) | undefined,
  ) => void;
  rightPanelMode: "editor" | "memo-list" | "task-list" | null;
  selectedItemsFromList: Set<number>;
  memoItems: BoardItemWithContent[];
  taskItems: BoardItemWithContent[];
  teamId?: string | null;
}

interface UseBoardOperationsReturn {
  // データ
  boardWithItems: BoardWithItems | undefined;
  boardDeletedItems:
    | { memos?: DeletedMemo[]; tasks?: DeletedTask[] }
    | undefined;
  isLoading: boolean;
  error: Error | null;
  boardName: string;
  boardDescription: string | null;
  boardMemos: Memo[];
  boardTasks: Task[];

  // ハンドラー
  handleExport: () => void;
  handleRemoveItem: (item: BoardItemWithContent) => Promise<void>;
  handleSelectMemo: (memo: Memo | DeletedMemo) => void;
  handleSelectTask: (task: Task | DeletedTask) => void;
  handleCloseDetail: () => void;
  handleCreateNewMemo: () => void;
  handleCreateNewTask: () => void;
  handleAddSelectedItems: () => Promise<void>;
  handleMemoDeleteAndSelectNext: (deletedMemo: Memo) => void;
  handleTaskDeleteAndSelectNext: (deletedTask: Task) => void;
  handleDeletedMemoDeleteAndSelectNext: (deletedItem: DeletedMemo) => void;
  handleDeletedTaskDeleteAndSelectNext: (deletedItem: DeletedTask) => void;
  handleMemoRestoreAndSelectNext: (deletedItem: DeletedMemo) => void;
  handleTaskRestoreAndSelectNext: (deletedItem: DeletedTask) => void;
  handleAddMemoToBoard: (memo: Memo) => Promise<void>;
  handleAddTaskToBoard: (task: Task) => Promise<void>;
  refetchDeletedItems: () => Promise<unknown>;
}

/**
 * ボード操作を管理するカスタムフック
 */
export function useBoardOperations({
  boardId,
  initialBoardName,
  initialBoardDescription,
  onSelectMemo,
  onSelectTask,
  onClearSelection,
  setRightPanelMode,
  createNewMemoHandler,
  createNewTaskHandler,
  rightPanelMode,
  selectedItemsFromList,
  memoItems,
  taskItems,
  teamId,
}: UseBoardOperationsProps): UseBoardOperationsReturn {
  // データ取得
  const {
    data: boardWithItems,
    isLoading,
    error,
  } = useBoardWithItems(boardId, false, teamId) as {
    data: BoardWithItems | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const { data: boardDeletedItems, refetch: refetchDeletedItems } =
    useBoardDeletedItems(boardId, teamId?.toString());

  const removeItemFromBoard = useRemoveItemFromBoard();
  const addItemToBoard = useAddItemToBoard();
  const { exportBoard } = useExport();

  // ボード情報
  const boardName = initialBoardName || boardWithItems?.name || "ボード";
  const boardDescription =
    initialBoardDescription || boardWithItems?.description;

  // boardWithItemsからメモとタスクを抽出（APIコール削減）
  const boardMemos = useMemo(
    () =>
      boardWithItems?.items
        ?.filter((item: BoardItemWithContent) => item.itemType === "memo")
        ?.map((item: BoardItemWithContent) => item.content as Memo) || [],
    [boardWithItems?.items],
  );

  const boardTasks = useMemo(
    () =>
      boardWithItems?.items
        ?.filter((item: BoardItemWithContent) => item.itemType === "task")
        ?.map((item: BoardItemWithContent) => item.content as Task) || [],
    [boardWithItems?.items],
  );

  // エクスポート処理
  const handleExport = useCallback(() => {
    if (!boardWithItems) return;

    exportBoard(
      boardName,
      boardDescription || null,
      boardWithItems.createdAt as number,
      memoItems,
      taskItems,
    );
  }, [
    boardWithItems,
    boardName,
    boardDescription,
    memoItems,
    taskItems,
    exportBoard,
  ]);

  // アイテム削除
  const handleRemoveItem = useCallback(
    async (item: BoardItemWithContent) => {
      if (confirm("このアイテムをボードから削除しますか？")) {
        try {
          await removeItemFromBoard.mutateAsync({
            boardId,
            itemId: item.itemId,
            itemType: item.itemType,
          });
          // 削除したアイテムが選択されていた場合、選択を解除
          if (item.itemType === "memo" && onSelectMemo && item.itemId) {
            onClearSelection?.();
          } else if (item.itemType === "task" && onSelectTask && item.itemId) {
            onClearSelection?.();
          }
        } catch {
          // エラーは上位でハンドリング
        }
      }
    },
    [
      boardId,
      removeItemFromBoard,
      onSelectMemo,
      onSelectTask,
      onClearSelection,
    ],
  );

  // 選択ハンドラー
  const handleSelectMemo = useCallback(
    (memo: Memo | DeletedMemo) => {
      setRightPanelMode(null); // リストモードを解除
      onSelectMemo?.(memo);
    },
    [onSelectMemo, setRightPanelMode],
  );

  const handleSelectTask = useCallback(
    (task: Task | DeletedTask) => {
      setRightPanelMode(null); // リストモードを解除
      onSelectTask?.(task);
    },
    [onSelectTask, setRightPanelMode],
  );

  const handleCloseDetail = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  // 新規作成ハンドラー
  const handleCreateNewMemo = useCallback(() => {
    console.log("🏗️ [use-board-operations] handleCreateNewMemo実行", {
      createNewMemoHandlerExists: !!createNewMemoHandler,
      onSelectMemoExists: !!onSelectMemo,
    });
    createNewMemoHandler(onSelectMemo);
    console.log("✅ [use-board-operations] handleCreateNewMemo完了");
  }, [createNewMemoHandler, onSelectMemo]);

  const handleCreateNewTask = useCallback(() => {
    createNewTaskHandler(onSelectTask);
  }, [createNewTaskHandler, onSelectTask]);

  // 一覧からボードに追加
  const handleAddSelectedItems = useCallback(async () => {
    if (selectedItemsFromList.size === 0) return;

    try {
      const itemType = rightPanelMode === "memo-list" ? "memo" : "task";
      const existingItemIds =
        boardWithItems?.items
          .filter((item: BoardItemWithContent) => item.itemType === itemType)
          .map((item: BoardItemWithContent) => item.itemId) || [];

      // 重複していないアイテムのみを追加
      const itemsToAdd = Array.from(selectedItemsFromList).filter(
        (itemId) => !existingItemIds.includes(itemId.toString()),
      );

      if (itemsToAdd.length === 0) {
        alert("選択されたアイテムは既にボードに追加されています");
        return;
      }

      const promises = itemsToAdd.map((itemId) => {
        return addItemToBoard.mutateAsync({
          boardId,
          data: { itemType, itemId: itemId.toString() },
        });
      });

      await Promise.all(promises);
      setRightPanelMode(null);

      if (itemsToAdd.length < selectedItemsFromList.size) {
        alert(`${itemsToAdd.length}件のアイテムを追加しました（重複分は除外）`);
      }
    } catch {
      // エラーは上位でハンドリング
    }
  }, [
    selectedItemsFromList,
    rightPanelMode,
    boardId,
    addItemToBoard,
    boardWithItems,
    setRightPanelMode,
  ]);

  // 削除後の次アイテム選択ハンドラー（メモ一覧と同じロジックを使用）
  const handleMemoDeleteAndSelectNext = useCallback(
    (deletedMemo: Memo) => {
      if (!onSelectMemo) return;

      // 削除前のメモ一覧を取得（boardMemosは削除前のデータ）
      const allMemos = boardMemos;

      if (allMemos.length === 0) {
        onClearSelection?.();
        return;
      }

      // DOM表示順序を取得
      const displayOrder = getMemoDisplayOrder();

      // メモ一覧と同じロジックを使用
      const nextMemo = getNextItemAfterDeletion(
        allMemos,
        deletedMemo,
        displayOrder,
      );

      if (nextMemo && nextMemo.id !== deletedMemo.id) {
        onSelectMemo(nextMemo);
      } else {
        onClearSelection?.();
      }
    },
    [boardMemos, onSelectMemo, onClearSelection],
  );

  const handleTaskDeleteAndSelectNext = useCallback(
    (deletedTask: Task) => {
      if (!onSelectTask) {
        return;
      }

      // 削除前のタスク一覧を取得（boardTasksは削除前のデータ）
      const allTasks = boardTasks;

      if (allTasks.length === 0) {
        onClearSelection?.();
        return;
      }

      // DOM表示順序を取得
      const displayOrder = getTaskDisplayOrder();

      // メモと同じロジックを使用
      const nextTask = getNextItemAfterDeletion(
        allTasks,
        deletedTask,
        displayOrder,
      );

      if (nextTask && nextTask.id !== deletedTask.id) {
        onSelectTask(nextTask);
      } else {
        onClearSelection?.();
      }
    },
    [boardTasks, onSelectTask, onClearSelection],
  );

  // 削除済みアイテムの復元ハンドラー
  const { handleRestoreAndSelectNext: rawHandleMemoRestoreAndSelectNext } =
    useDeletedItemOperations({
      deletedItems: boardDeletedItems?.memos || null,
      onSelectDeletedItem: (memo: DeletedMemo | null) => {
        if (memo === null) {
          // 次のアイテムがない場合は選択解除してエディターを閉じる
          onClearSelection?.();
        } else {
          // 削除済みメモとして選択 - 右パネルの選択状態が更新される
          onSelectMemo?.(memo);
        }
      },
      setScreenMode: () => {}, // ボードでは画面モード変更なし
      editorSelector: "[data-memo-editor]",
    });

  // 復元ハンドラー - 復元完了後に次選択するように修正
  const handleMemoRestoreAndSelectNext = useCallback(
    async (deletedMemo: DeletedMemo) => {
      // 復元処理後に削除済みアイテム一覧を更新
      await refetchDeletedItems();
      // 復元とキャッシュ更新が完了してから次選択を実行
      rawHandleMemoRestoreAndSelectNext(deletedMemo);
    },
    [rawHandleMemoRestoreAndSelectNext, refetchDeletedItems],
  );

  const { handleRestoreAndSelectNext: rawHandleTaskRestoreAndSelectNext } =
    useDeletedItemOperations({
      deletedItems: boardDeletedItems?.tasks || null,
      onSelectDeletedItem: (task: DeletedTask | null) => {
        if (task === null) {
          // 次のアイテムがない場合は選択解除してエディターを閉じる
          onClearSelection?.();
        } else {
          onSelectTask?.(task);
        }
      },
      setScreenMode: () => {}, // ボードでは画面モード変更なし
      editorSelector: "[data-task-editor]",
    });

  // タスク復元ハンドラー - 復元完了後に次選択するように修正
  const handleTaskRestoreAndSelectNext = useCallback(
    async (deletedTask: DeletedTask) => {
      // 復元処理後に削除済みアイテム一覧を更新
      await refetchDeletedItems();
      // 復元とキャッシュ更新が完了してから次選択を実行
      rawHandleTaskRestoreAndSelectNext(deletedTask);
    },
    [rawHandleTaskRestoreAndSelectNext, refetchDeletedItems],
  );

  // 削除済みアイテムの完全削除ハンドラー
  const { selectNextDeletedItem: handleDeletedMemoDeleteAndSelectNext } =
    useDeletedItemOperations({
      deletedItems: boardDeletedItems?.memos || null,
      onSelectDeletedItem: (memo: DeletedMemo | null) => {
        if (memo === null) {
          // 次のアイテムがない場合は選択解除してエディターを閉じる
          onClearSelection?.();
        } else {
          onSelectMemo?.(memo);
        }
      },
      setScreenMode: () => {}, // ボードでは画面モード変更なし
      editorSelector: "[data-memo-editor]",
    });

  const { selectNextDeletedItem: handleDeletedTaskDeleteAndSelectNext } =
    useDeletedItemOperations({
      deletedItems: boardDeletedItems?.tasks || null,
      onSelectDeletedItem: (task: DeletedTask | null) => {
        if (task === null) {
          // 次のアイテムがない場合は選択解除してエディターを閉じる
          onClearSelection?.();
        } else {
          onSelectTask?.(task);
        }
      },
      setScreenMode: () => {}, // ボードでは画面モード変更なし
      editorSelector: "[data-task-editor]",
    });

  // ボードにアイテムを追加
  const handleAddMemoToBoard = useCallback(
    async (memo: Memo) => {
      // 既にボードに存在するかチェック
      const existingMemoIds = boardMemos.map((m) => m.id);
      if (existingMemoIds.includes(memo.id)) {
        alert("このメモは既にボードに追加されています");
        return;
      }

      try {
        await addItemToBoard.mutateAsync({
          boardId,
          data: {
            itemType: "memo",
            itemId: memo.originalId || memo.id.toString(),
          },
        });
      } catch {
        // エラーは上位でハンドリング
      }
    },
    [boardId, addItemToBoard, boardMemos],
  );

  const handleAddTaskToBoard = useCallback(
    async (task: Task) => {
      // 既にボードに存在するかチェック
      const existingTaskIds = boardTasks.map((t) => t.id);
      if (existingTaskIds.includes(task.id)) {
        alert("このタスクは既にボードに追加されています");
        return;
      }

      try {
        await addItemToBoard.mutateAsync({
          boardId,
          data: {
            itemType: "task",
            itemId: task.originalId || task.id.toString(),
          },
        });
      } catch {
        // エラーは上位でハンドリング
      }
    },
    [boardId, addItemToBoard, boardTasks],
  );

  return {
    // データ
    boardWithItems,
    boardDeletedItems,
    isLoading,
    error,
    boardName,
    boardDescription: boardDescription || null,
    boardMemos,
    boardTasks,

    // ハンドラー
    handleExport,
    handleRemoveItem,
    handleSelectMemo,
    handleSelectTask,
    handleCloseDetail,
    handleCreateNewMemo,
    handleCreateNewTask,
    handleAddSelectedItems,
    handleMemoDeleteAndSelectNext,
    handleTaskDeleteAndSelectNext,
    handleDeletedMemoDeleteAndSelectNext,
    handleDeletedTaskDeleteAndSelectNext,
    handleMemoRestoreAndSelectNext,
    handleTaskRestoreAndSelectNext,
    handleAddMemoToBoard,
    handleAddTaskToBoard,
    refetchDeletedItems,
  };
}
