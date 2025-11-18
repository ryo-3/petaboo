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
import { useRestoreMemo } from "@/src/hooks/use-memos";
import { useRestoreTask } from "@/src/hooks/use-tasks";
import { BoardItemWithContent, BoardWithItems } from "@/src/types/board";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import { OriginalIdUtils } from "@/src/types/common";
import { useTeamContext } from "@/src/contexts/team-context";
import { useTeamDetailSafe } from "@/src/contexts/team-detail-context";
import { useUnsavedChangesGuard } from "@/src/hooks/use-unsaved-changes-guard";

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
  teamId?: string | null; // 後方互換性のため残す（非推奨）
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

  // 未保存変更チェック用ref
  memoHasUnsavedChangesRef: React.MutableRefObject<boolean>;
  memoShowConfirmModalRef: React.MutableRefObject<(() => void) | null>;
  taskHasUnsavedChangesRef: React.MutableRefObject<boolean>;
  taskShowConfirmModalRef: React.MutableRefObject<(() => void) | null>;
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
  teamId: teamIdProp,
}: UseBoardOperationsProps): UseBoardOperationsReturn {
  // TeamContextからチーム情報を取得（propsより優先）
  const { isTeamMode, teamId: teamIdFromContext } = useTeamContext();
  // TeamDetailContextから未保存チェック用refを取得（チーム側のみ）
  const teamDetailContext = useTeamDetailSafe();

  // propsのteamIdとContextのteamIdを統合（Contextを優先、後方互換性のためpropsも許容）
  const teamIdStr = teamIdFromContext?.toString() || teamIdProp;
  const teamId =
    teamIdFromContext || (teamIdProp ? parseInt(teamIdProp) : undefined);

  // データ取得
  const {
    data: boardWithItems,
    isLoading,
    error,
  } = useBoardWithItems(boardId, false, teamIdStr) as {
    data: BoardWithItems | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const { data: boardDeletedItems, refetch: refetchDeletedItems } =
    useBoardDeletedItems(boardId, teamIdStr);

  const removeItemFromBoard = useRemoveItemFromBoard();
  const addItemToBoard = useAddItemToBoard();
  const { exportBoard } = useExport();

  // 復元用フック
  const restoreMemoMutation = useRestoreMemo({
    teamMode: isTeamMode,
    teamId,
    boardId,
  });

  const restoreTaskMutation = useRestoreTask({
    teamMode: isTeamMode,
    teamId,
    boardId,
  });

  // 完全削除用フック（将来の機能拡張のため保持）
  // const permanentDeleteMemoMutation = usePermanentDeleteMemo({
  //   teamMode: isTeamMode,
  //   teamId,
  // });
  // const permanentDeleteTaskMutation = usePermanentDeleteTask({
  //   teamMode: isTeamMode,
  //   teamId,
  // });

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
            teamId,
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
      teamId,
      onSelectMemo,
      onSelectTask,
      onClearSelection,
    ],
  );

  // 未保存変更ガード（メモ用）
  const {
    personalHasUnsavedChangesRef: memoHasUnsavedChangesRef,
    personalShowConfirmModalRef: memoShowConfirmModalRef,
    handleSelectWithGuard: handleSelectMemoWithGuard,
  } = useUnsavedChangesGuard<Memo | DeletedMemo>({
    itemType: "memo",
    teamMode: isTeamMode,
    teamDetailContext: teamDetailContext,
    onSelectItem: onSelectMemo || (() => {}),
    setScreenMode: (mode) => {
      if (mode === "view") {
        setRightPanelMode(null);
      }
    },
  });

  // 未保存変更ガード（タスク用）
  const {
    personalHasUnsavedChangesRef: taskHasUnsavedChangesRef,
    personalShowConfirmModalRef: taskShowConfirmModalRef,
    handleSelectWithGuard: handleSelectTaskWithGuard,
  } = useUnsavedChangesGuard<Task | DeletedTask>({
    itemType: "task",
    teamMode: isTeamMode,
    teamDetailContext: teamDetailContext,
    onSelectItem: onSelectTask || (() => {}),
    setScreenMode: (mode) => {
      if (mode === "view") {
        setRightPanelMode(null);
      }
    },
  });

  // 選択ハンドラー（未保存ガード付き）
  const handleSelectMemo = handleSelectMemoWithGuard;
  const handleSelectTask = handleSelectTaskWithGuard;

  const handleCloseDetail = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  // 新規作成ハンドラー
  const handleCreateNewMemo = useCallback(() => {
    createNewMemoHandler(onSelectMemo);
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
      try {
        // 実際の復元APIを呼び出す
        await restoreMemoMutation.mutateAsync(deletedMemo.originalId);

        // 復元処理後に削除済みアイテム一覧を更新
        await refetchDeletedItems();

        // 復元とキャッシュ更新が完了してから次選択を実行
        rawHandleMemoRestoreAndSelectNext(deletedMemo);
      } catch {
        // エラーは useRestoreMemo の onError で処理される
      }
    },
    [
      rawHandleMemoRestoreAndSelectNext,
      refetchDeletedItems,
      restoreMemoMutation,
    ],
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
      try {
        // 実際の復元APIを呼び出す
        await restoreTaskMutation.mutateAsync(deletedTask.originalId);

        // 復元処理後に削除済みアイテム一覧を更新
        await refetchDeletedItems();

        // 復元とキャッシュ更新が完了してから次選択を実行
        rawHandleTaskRestoreAndSelectNext(deletedTask);
      } catch {
        // エラーは useRestoreTask の onError で処理される
      }
    },
    [
      rawHandleTaskRestoreAndSelectNext,
      refetchDeletedItems,
      restoreTaskMutation,
    ],
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
            itemId: OriginalIdUtils.fromItem(memo) || "",
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
            itemId: OriginalIdUtils.fromItem(task) || "",
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

    // 未保存変更チェック用ref
    memoHasUnsavedChangesRef,
    memoShowConfirmModalRef,
    taskHasUnsavedChangesRef,
    taskShowConfirmModalRef,
  };
}
