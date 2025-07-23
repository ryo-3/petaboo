import BoardMemoSection from "@/components/features/board/board-memo-section";
import BoardRightPanel from "@/components/features/board/board-right-panel";
import BoardTaskSection from "@/components/features/board/board-task-section";
import DesktopUpper from "@/components/layout/desktop-upper";
import Tooltip from "@/components/ui/base/tooltip";
import {
  useAddItemToBoard,
  useBoardWithItems,
  useRemoveItemFromBoard,
  useBoardDeletedItems,
} from "@/src/hooks/use-boards";
import { useBoardState } from "@/src/hooks/use-board-state";
import { useExport } from "@/src/hooks/use-export";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import { memo, useCallback, useEffect, useState, useMemo } from "react";
import BoardHeader from "@/components/features/board/board-header";
import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { useDeleteMemo } from "@/src/hooks/use-memos";
import { useDeleteTask } from "@/src/hooks/use-tasks";
import { getNextItemAfterDeletion, getMemoDisplayOrder, getTaskDisplayOrder } from "@/src/utils/domUtils";
import { useDeletedItemOperations } from "@/src/hooks/use-deleted-item-operations";

interface BoardDetailProps {
  boardId: number;
  onBack: () => void;
  selectedMemo?: Memo | DeletedMemo | null;
  selectedTask?: Task | DeletedTask | null;
  onSelectMemo?: (memo: Memo | DeletedMemo | null) => void;
  onSelectTask?: (task: Task | DeletedTask | null) => void;
  onClearSelection?: () => void;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
  showBoardHeader?: boolean;
  serverInitialTitle?: string;
  boardCompleted?: boolean;
  isDeleted?: boolean;
}


function BoardDetailScreen({
  boardId,
  onBack,
  selectedMemo: propSelectedMemo,
  selectedTask: propSelectedTask,
  onSelectMemo,
  onSelectTask,
  onClearSelection,
  initialBoardName,
  initialBoardDescription,
  showBoardHeader = true,
  serverInitialTitle,
  boardCompleted = false,
  isDeleted = false,
}: BoardDetailProps) {
  // console.log('🔄 BoardDetailScreen render');
  // 状態管理フック
  const {
    activeTaskTab,
    activeMemoTab,
    showTabText,
    rightPanelMode,
    selectedItemsFromList,
    viewMode,
    columnCount,
    showEditDate,
    boardLayout,
    isReversed,
    showMemo,
    showTask,
    setRightPanelMode,
    setViewMode,
    setColumnCount,
    setShowEditDate,
    handleBoardLayoutChange,
    handleSettings,
    handleMemoToggle,
    handleTaskToggle,
    handleTaskTabChange,
    handleMemoTabChange,
    handleToggleItemSelection,
    handleCloseRightPanel,
    createNewMemoHandler,
    createNewTaskHandler,
    setShowTabText,
  } = useBoardState();

  // propsから選択状態を使用（Fast Refresh対応）
  const selectedMemo = propSelectedMemo;
  const selectedTask = propSelectedTask;

  // 複数選択状態管理（統合）
  const [selectionMode, setSelectionMode] = useState<"select" | "check">("select");
  // メモの選択状態をタブ別に分離
  const [checkedNormalMemos, setCheckedNormalMemos] = useState<Set<string | number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<string | number>>(new Set());
  const [checkedTasks, setCheckedTasks] = useState<Set<string | number>>(new Set());
  
  // 現在のタブに応じた選択状態とセッター
  const checkedMemos = activeMemoTab === "normal" ? checkedNormalMemos : checkedDeletedMemos;
  const setCheckedMemos = useCallback((newValue: Set<string | number> | ((prev: Set<string | number>) => Set<string | number>)) => {
    const targetSetter = activeMemoTab === "normal" ? setCheckedNormalMemos : setCheckedDeletedMemos;
    if (typeof newValue === 'function') {
      targetSetter(prev => {
        const result = newValue(prev);
        console.log(`🔄 setCheckedMemos (${activeMemoTab}) function:`, { before: Array.from(prev), after: Array.from(result) });
        return result;
      });
    } else {
      console.log(`🔄 setCheckedMemos (${activeMemoTab}) direct:`, Array.from(newValue));
      targetSetter(newValue);
    }
  }, [activeMemoTab]);


  // 選択ハンドラー
  const handleMemoSelectionToggle = useCallback((memoId: string | number) => {
    console.log('📝 handleMemoSelectionToggle:', memoId);
    setCheckedMemos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memoId)) {
        newSet.delete(memoId);
      } else {
        newSet.add(memoId);
      }
      console.log('📝 New checkedMemos:', Array.from(newSet));
      return newSet;
    });
  }, [setCheckedMemos]);

  const handleTaskSelectionToggle = useCallback((taskId: string | number) => {
    setCheckedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // 選択モード切り替え（統合）
  const handleSelectionModeChange = useCallback((mode: "select" | "check") => {
    setSelectionMode(mode);
    // checkモードからselectモードに切り替える時、選択状態をクリア
    if (mode === "select") {
      setCheckedNormalMemos(new Set());
      setCheckedDeletedMemos(new Set());
      setCheckedTasks(new Set());
    }
  }, []);

  const [isMemoDeleting, setIsMemoDeleting] = useState(false);
  const [isMemoLidOpen, setIsMemoLidOpen] = useState(false);
  const [deletingItemType, setDeletingItemType] = useState<'memo' | 'task' | null>(null);
  
  // 削除確認モーダル
  const bulkDelete = useBulkDelete();
  const deleteMemoMutation = useDeleteMemo();
  const deleteTaskMutation = useDeleteTask();
  
  // アニメーション管理（checkedItemsを数値のみに変換）
  const memoIdsAsNumbers = useMemo(() => {
    return new Set(Array.from(checkedMemos).filter(id => typeof id === 'number') as number[]);
  }, [checkedMemos]);

  // 一括削除ハンドラー（元のボード仕様）
  const handleBulkDelete = useCallback(async (itemType: 'memo' | 'task') => {
    const targetIds = itemType === 'memo' ? Array.from(checkedMemos) : Array.from(checkedTasks);
    if (targetIds.length === 0) return;

    setDeletingItemType(itemType);
    setIsMemoDeleting(true);
    setIsMemoLidOpen(true);

    await bulkDelete.confirmBulkDelete(
      targetIds as number[],
      1,
      async (ids: (string | number)[]) => {
        console.log('完全削除:', ids);
        // 完全削除の処理
        for (const id of ids) {
          if (itemType === 'memo') {
            await deleteMemoMutation.mutateAsync(id as number);
          } else {
            await deleteTaskMutation.mutateAsync(id as number);
          }
        }
        // 選択をクリア
        if (itemType === 'memo') {
          setCheckedMemos(new Set());
        } else {
          setCheckedTasks(new Set());
        }
      },
      <div className="text-sm text-gray-700 mb-3">
        選択した{itemType === 'memo' ? 'メモ' : 'タスク'}の操作を選択してください
      </div>
    );
  }, [checkedMemos, checkedTasks, bulkDelete, deleteMemoMutation, deleteTaskMutation, setCheckedMemos]);

  // ボードから削除の処理
  const handleRemoveFromBoard = useCallback(async () => {
    const targetIds = deletingItemType === 'memo' ? Array.from(checkedMemos) : Array.from(checkedTasks);
    
    try {
      for (const id of targetIds) {
        await removeItemFromBoard.mutateAsync({
          boardId,
          itemId: id as number,
          itemType: deletingItemType!,
        });
      }
      
      // 選択をクリア
      if (deletingItemType === 'memo') {
        setCheckedMemos(new Set());
      } else {
        setCheckedTasks(new Set());
      }
      
      bulkDelete.handleCancel();
    } catch (error) {
      console.error("Failed to remove items from board:", error);
    } finally {
      setDeletingItemType(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingItemType, checkedMemos, checkedTasks, boardId, bulkDelete, setCheckedMemos]);
  
  



  // タブテキスト表示制御
  useEffect(() => {
    if (selectedMemo || selectedTask || rightPanelMode) {
      // 右パネルが開いたらすぐにテキストを非表示
      setShowTabText(false);
    } else {
      // 右パネルが閉じたら300ms後にテキストを表示
      const timer = setTimeout(() => {
        setShowTabText(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMemo, selectedTask, rightPanelMode, setShowTabText]);

  // 計算されたカラム数（右パネル表示時は最大2列に制限）
  const effectiveColumnCount =
    selectedMemo || selectedTask || rightPanelMode
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;


  const { data: boardWithItems, isLoading, error } = useBoardWithItems(boardId);
  const { data: boardDeletedItems } = useBoardDeletedItems(boardId);
  
  const removeItemFromBoard = useRemoveItemFromBoard();
  const addItemToBoard = useAddItemToBoard();
  const { exportBoard } = useExport();

  // boardWithItemsからメモとタスクを抽出（APIコール削減）
  const boardMemos = useMemo(() => 
    boardWithItems?.items
      ?.filter(item => item.itemType === 'memo')
      ?.map(item => item.content as Memo) || []
  , [boardWithItems?.items]);
  
  const boardTasks = useMemo(() => 
    boardWithItems?.items
      ?.filter(item => item.itemType === 'task')
      ?.map(item => item.content as Task) || []
  , [boardWithItems?.items]);




  // ボード名は即座に表示
  const boardName = initialBoardName || boardWithItems?.name || "ボード";
  const boardDescription =
    initialBoardDescription || boardWithItems?.description;

  // console.log('🔍 BoardDetail状態:', {
  //   initialBoardName,
  //   boardWithItemsName: boardWithItems?.name,
  //   boardName,
  //   isLoading,
  //   error: !!error
  // });

  // ページタイトル設定
  useEffect(() => {
    document.title = `${boardName} - ボード`;
    return () => {
      document.title = "メモ帳アプリ";
    };
  }, [boardName]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRemoveItem = async (item: BoardItemWithContent) => {
    if (confirm("このアイテムをボードから削除しますか？")) {
      try {
        await removeItemFromBoard.mutateAsync({
          boardId,
          itemId: parseInt(item.itemId),
          itemType: item.itemType,
        });
        // 削除したアイテムが選択されていた場合、選択を解除
        if (
          item.itemType === "memo" &&
          selectedMemo &&
          selectedMemo.id.toString() === item.itemId
        ) {
          onClearSelection?.();
        } else if (
          item.itemType === "task" &&
          selectedTask &&
          selectedTask.id.toString() === item.itemId
        ) {
          onClearSelection?.();
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    }
  };

  const handleSelectMemo = useCallback(
    (memo: Memo | DeletedMemo) => {
      setRightPanelMode(null); // リストモードを解除
      onSelectMemo?.(memo);
    },
    [onSelectMemo, setRightPanelMode]
  );

  const handleSelectTask = useCallback(
    (task: Task | DeletedTask) => {
      setRightPanelMode(null); // リストモードを解除
      onSelectTask?.(task);
    },
    [onSelectTask, setRightPanelMode]
  );

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
          .filter((item) => item.itemType === itemType)
          .map((item) => item.itemId) || [];

      // 重複していないアイテムのみを追加
      const itemsToAdd = Array.from(selectedItemsFromList).filter(
        (itemId) => !existingItemIds.includes(itemId.toString())
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
    } catch (error) {
      console.error("Failed to add items to board:", error);
    }
  }, [
    selectedItemsFromList,
    rightPanelMode,
    boardId,
    addItemToBoard,
    boardWithItems,
    setRightPanelMode,
  ]);


  // メモとタスクのアイテムを分離（読み込み中も空配列で処理）
  const allMemoItems = useMemo(() =>
    boardWithItems?.items.filter((item) => item.itemType === "memo") || [], [boardWithItems]);
  const allTaskItems =
    boardWithItems?.items.filter((item) => item.itemType === "task") || [];

  // アクティブタブに応じてメモをフィルタリング
  const memoItems = activeMemoTab === "deleted" 
    ? (boardDeletedItems?.memos || []).map((memo, index) => ({
        id: memo.id,
        boardId: boardId,
        itemId: memo.originalId, // originalIdを使用
        itemType: 'memo' as const,
        content: memo,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
        position: index
      })) as BoardItemWithContent[]
    : allMemoItems;

  // アクティブタブに応じてタスクをフィルタリング
  const taskItems = activeTaskTab === "deleted"
    ? (boardDeletedItems?.tasks || []).map((task, index) => ({
        id: task.id,
        boardId: boardId,
        itemId: task.originalId, // originalIdを使用
        itemType: 'task' as const,
        content: task,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        position: index
      })) as BoardItemWithContent[]
    : allTaskItems.filter((item) => {
        const task = item.content as Task;
        return task.status === activeTaskTab;
      });


  // チェック状態の自動クリーンアップ（メモ一覧と同じ仕組み）
  // 通常メモのクリーンアップ
  useEffect(() => {
    if (allMemoItems && activeMemoTab === "normal" && !isMemoDeleting) {
      const allMemoIds = new Set(allMemoItems.map((item) => item.itemId));
      const newCheckedNormalMemos = new Set(
        Array.from(checkedNormalMemos).filter((id) => {
          for (const memoId of allMemoIds) {
            if (memoId === id) return true;
          }
          return false;
        })
      );
      if (newCheckedNormalMemos.size !== checkedNormalMemos.size) {
        setCheckedNormalMemos(newCheckedNormalMemos);
      }
    }
  }, [allMemoItems, activeMemoTab, checkedNormalMemos, isMemoDeleting]);

  // 削除済みメモのクリーンアップ
  useEffect(() => {
    if (boardDeletedItems?.memos && activeMemoTab === "deleted" && !isMemoDeleting) {
      const allDeletedMemoIds = new Set(boardDeletedItems.memos.map((memo) => memo.originalId));
      const newCheckedDeletedMemos = new Set(
        Array.from(checkedDeletedMemos).filter((id) => {
          for (const memoId of allDeletedMemoIds) {
            if (memoId === id) return true;
          }
          return false;
        })
      );
      if (newCheckedDeletedMemos.size !== checkedDeletedMemos.size) {
        setCheckedDeletedMemos(newCheckedDeletedMemos);
      }
    }
  }, [boardDeletedItems?.memos, activeMemoTab, checkedDeletedMemos, isMemoDeleting]);

  useEffect(() => {
    if (taskItems) {
      const allTaskIds = new Set(taskItems.map((item) => item.itemId));
      const newCheckedTasks = new Set(
        Array.from(checkedTasks).filter((id) => {
          for (const taskId of allTaskIds) {
            if (taskId === id) return true;
          }
          return false;
        })
      );
      if (newCheckedTasks.size !== checkedTasks.size) {
        setCheckedTasks(newCheckedTasks);
      }
    }
  }, [taskItems, checkedTasks, setCheckedTasks]);

  // 各ステータスの件数を計算
  const todoCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "todo"
  ).length;
  const inProgressCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "in_progress"
  ).length;
  const completedCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "completed"
  ).length;
  const deletedCount = boardDeletedItems?.tasks?.length || 0; // 削除済みタスクの件数

  // メモの件数を計算
  const normalMemoCount = allMemoItems.length;
  const deletedMemoCount = boardDeletedItems?.memos?.length || 0; // 削除済みメモの件数
  
  // デバッグ用ログ
  // console.log('🔍 ボード削除済みアイテム状態:', {
  //   boardId,
  //   deletedMemos: deletedMemoCount,
  //   deletedTasks: deletedCount,
  //   boardDeletedItems,
  //   memoItems: memoItems.length,
  //   taskItems: taskItems.length,
  //   activeMemoTab,
  //   activeTaskTab
  // });

  // メモ削除後の次アイテム選択ハンドラー
  const handleMemoDeleteAndSelectNext = useCallback((deletedMemo: Memo) => {
    if (!onSelectMemo) return;
    
    const displayOrder = getMemoDisplayOrder();
    const nextMemo = getNextItemAfterDeletion(
      memoItems.map(item => item.content as Memo),
      deletedMemo,
      displayOrder
    );
    
    if (nextMemo) {
      onSelectMemo(nextMemo);
    } else {
      onClearSelection?.();
    }
  }, [memoItems, onSelectMemo, onClearSelection]);

  // タスク削除後の次アイテム選択ハンドラー
  const handleTaskDeleteAndSelectNext = useCallback((deletedTask: Task) => {
    if (!onSelectTask) return;
    
    const displayOrder = getTaskDisplayOrder();
    const allTasks = taskItems.map(item => item.content as Task);
    
    const nextTask = getNextItemAfterDeletion(
      allTasks,
      deletedTask,
      displayOrder
    );
    
    if (nextTask) {
      onSelectTask(nextTask);
    } else {
      onClearSelection?.();
    }
  }, [taskItems, onSelectTask, onClearSelection]);

  // 削除済みメモの復元専用ハンドラー
  const { handleRestoreAndSelectNext: handleMemoRestoreAndSelectNext } = useDeletedItemOperations({
    deletedItems: boardDeletedItems?.memos || null,
    onSelectDeletedItem: (memo: DeletedMemo | null) => onSelectMemo?.(memo),
    setScreenMode: () => {}, // ボードでは画面モード変更なし
    editorSelector: "[data-memo-editor]",
  });

  // 削除済みタスクの復元専用ハンドラー
  const { handleRestoreAndSelectNext: handleTaskRestoreAndSelectNext } = useDeletedItemOperations({
    deletedItems: boardDeletedItems?.tasks || null,
    onSelectDeletedItem: (task: DeletedTask | null) => onSelectTask?.(task),
    setScreenMode: () => {}, // ボードでは画面モード変更なし
    editorSelector: "[data-task-editor]",
  });

  // ボードにメモを追加
  const handleAddMemoToBoard = useCallback(async (memo: Memo) => {
    // 既にボードに存在するかチェック
    const existingMemoIds = boardMemos.map(m => m.id);
    if (existingMemoIds.includes(memo.id)) {
      alert('このメモは既にボードに追加されています');
      return;
    }

    try {
      await addItemToBoard.mutateAsync({
        boardId,
        data: {
          itemType: 'memo',
          itemId: memo.id.toString(),
        },
      });
    } catch (error) {
      console.error('❌ メモの追加に失敗:', error);
    }
  }, [boardId, addItemToBoard, boardMemos]);

  // ボードにタスクを追加
  const handleAddTaskToBoard = useCallback(async (task: Task) => {
    // 既にボードに存在するかチェック
    const existingTaskIds = boardTasks.map(t => t.id);
    if (existingTaskIds.includes(task.id)) {
      alert('このタスクは既にボードに追加されています');
      return;
    }

    try {
      await addItemToBoard.mutateAsync({
        boardId,
        data: {
          itemType: 'task',
          itemId: task.id.toString(),
        },
      });
    } catch (error) {
      console.error('❌ タスクの追加に失敗:', error);
    }
  }, [boardId, addItemToBoard, boardTasks]);

  const handleMemoSelectAll = useCallback(() => {
    const currentMemoIds = memoItems.map((item) => item.itemId); // originalIdを使用
    if (checkedMemos.size === currentMemoIds.length) {
      setCheckedMemos(new Set());
    } else {
      setCheckedMemos(new Set(currentMemoIds));
    }
  }, [memoItems, checkedMemos.size, setCheckedMemos]);

  const handleTaskSelectAll = useCallback(() => {
    const currentTaskIds = taskItems.map((item) => item.itemId); // originalIdを使用
    if (checkedTasks.size === currentTaskIds.length) {
      setCheckedTasks(new Set());
    } else {
      setCheckedTasks(new Set(currentTaskIds));
    }
  }, [taskItems, checkedTasks.size]);

  // 全選択状態の計算
  const isMemoAllSelected = memoItems.length > 0 && checkedMemos.size === memoItems.length;
  const isTaskAllSelected = taskItems.length > 0 && checkedTasks.size === taskItems.length;






  // エクスポート処理
  const handleExport = useCallback(() => {
    if (!boardWithItems) return;
    
    exportBoard(
      boardName,
      boardDescription || null,
      boardWithItems.createdAt as number,
      memoItems,
      taskItems
    );
  }, [boardWithItems, boardName, boardDescription, memoItems, taskItems, exportBoard]);

  // エラー時のみエラー表示
  if (error) {
    return (
      <div className={showBoardHeader ? "p-6" : ""}>
        {showBoardHeader && (
          <BoardHeader
            boardId={boardId}
            boardName={serverInitialTitle || boardName}
            boardDescription={boardDescription}
            boardCompleted={boardCompleted}
            isDeleted={isDeleted}
            onExport={() => {}}
            isExportDisabled={true}
          />
        )}
        <div className="text-center py-8">
          <p className="text-red-500">アイテムの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* 左側：メモ・タスク一覧 */}
      <div
        className={`${
          selectedMemo || selectedTask || rightPanelMode
            ? rightPanelMode
              ? "w-[30%] border-r border-gray-300" // リスト表示時は広め
              : "w-[44%] border-r border-gray-300" // エディター表示時
            : "w-full"
        } pt-3 pl-5 pr-4 ${selectedMemo || selectedTask || rightPanelMode ? "pr-2" : "pr-4"} flex flex-col transition-all duration-300 relative`}
      >
        {/* DesktopUpper コントロール（BoardHeaderの代わり） */}
        <div>
          <DesktopUpper
            currentMode="board"
            activeTab="normal"
            onTabChange={() => {}} // ボードではタブ切り替えは無効
            onCreateNew={() => {}} // 既存のボタンを使用
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columnCount={columnCount}
            onColumnCountChange={setColumnCount}
            rightPanelMode={
              selectedMemo || selectedTask || rightPanelMode ? "view" : "hidden"
            }
            customTitle={boardName || "ボード詳細"}
            boardDescription={boardDescription}
            boardId={boardId}
            onBoardExport={handleExport}
            onBoardSettings={handleSettings}
            isExportDisabled={false}
            marginBottom="mb-2"
            headerMarginBottom="mb-1"
            showEditDate={showEditDate}
            onShowEditDateChange={setShowEditDate}
            boardLayout={boardLayout}
            isReversed={isReversed}
            onBoardLayoutChange={handleBoardLayoutChange}
            showMemo={rightPanelMode === "task-list" ? false : showMemo}
            showTask={rightPanelMode === "memo-list" ? false : showTask}
            onMemoToggle={handleMemoToggle}
            onTaskToggle={handleTaskToggle}
            contentFilterRightPanelMode={rightPanelMode}
            normalCount={allMemoItems.length + allTaskItems.length}
            completedCount={completedCount}
            deletedCount={deletedCount + deletedMemoCount}
            selectionMode={selectionMode}
            onSelectionModeChange={handleSelectionModeChange}
            onSelectAll={undefined}
            isAllSelected={false}
          />
        </div>

        {/* メモ・タスクコンテンツ */}
        <div
          className={`${
            rightPanelMode === "memo-list" || rightPanelMode === "task-list"
              ? "flex flex-col"
              : !showMemo || !showTask || boardLayout === "vertical"
                ? isReversed
                  ? "flex flex-col-reverse"
                  : "flex flex-col"
                : `grid grid-cols-1 lg:grid-cols-2${isReversed ? " [&>*:nth-child(1)]:order-2 [&>*:nth-child(2)]:order-1" : ""}`
          } gap-4 flex-1 min-h-0`}
        >
          {/* メモ列 */}
          <BoardMemoSection
            rightPanelMode={rightPanelMode}
            showMemo={showMemo}
            allMemoItems={allMemoItems}
            memoItems={memoItems}
            activeMemoTab={activeMemoTab}
            normalMemoCount={normalMemoCount}
            deletedMemoCount={deletedMemoCount}
            showTabText={showTabText}
            isLoading={isLoading}
            effectiveColumnCount={effectiveColumnCount}
            viewMode={viewMode}
            showEditDate={showEditDate}
            selectedMemo={selectedMemo}
            onCreateNewMemo={handleCreateNewMemo}
            onSetRightPanelMode={setRightPanelMode}
            onMemoTabChange={handleMemoTabChange}
            onSelectMemo={handleSelectMemo}
            memoSelectionMode={selectionMode}
            checkedMemos={checkedMemos}
            onMemoSelectionToggle={handleMemoSelectionToggle}
            onSelectAll={handleMemoSelectAll}
            isAllSelected={isMemoAllSelected}
            onBulkDelete={() => handleBulkDelete('memo')}
            isDeleting={isMemoDeleting}
            isLidOpen={isMemoLidOpen}
            currentDisplayCount={memoIdsAsNumbers.size}
          />

          {/* タスク列 */}
          <BoardTaskSection
            rightPanelMode={rightPanelMode}
            showTask={showTask}
            allTaskItems={allTaskItems}
            taskItems={taskItems}
            activeTaskTab={activeTaskTab}
            todoCount={todoCount}
            inProgressCount={inProgressCount}
            completedCount={completedCount}
            deletedCount={deletedCount}
            showTabText={showTabText}
            isLoading={isLoading}
            effectiveColumnCount={effectiveColumnCount}
            viewMode={viewMode}
            showEditDate={showEditDate}
            selectedTask={selectedTask}
            onCreateNewTask={handleCreateNewTask}
            onSetRightPanelMode={setRightPanelMode}
            onTaskTabChange={handleTaskTabChange}
            onSelectTask={handleSelectTask}
            taskSelectionMode={selectionMode}
            checkedTasks={checkedTasks}
            onTaskSelectionToggle={handleTaskSelectionToggle}
            onSelectAll={handleTaskSelectAll}
            isAllSelected={isTaskAllSelected}
            onBulkDelete={() => handleBulkDelete('task')}
            isDeleting={false}
            isLidOpen={false}
            currentDisplayCount={0}
          />
        </div>

        {/* フローティング：一覧へ戻るボタン */}
        <div className="fixed bottom-3 left-3 z-10">
          <Tooltip text="一覧へ戻る" position="right">
            <button
              onClick={onBack}
              className="p-1 size-9 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 rounded-lg border border-gray-200 transition-all flex items-center gap-2"
            >
              <svg
                className="size-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 削除モーダル */}
      <BulkDeleteConfirmation
        isOpen={bulkDelete.isModalOpen}
        onClose={() => {
          setDeletingItemType(null);
          bulkDelete.handleCancel();
        }}
        onConfirm={bulkDelete.handleConfirm}
        count={bulkDelete.targetIds.length}
        itemType={deletingItemType || "memo"}
        deleteType="normal"
        isLoading={bulkDelete.isDeleting}
        customMessage={bulkDelete.customMessage}
        customTitle={`${deletingItemType === 'memo' ? 'メモ' : 'タスク'}の操作を選択`}
        showRemoveFromBoard={true}
        onRemoveFromBoard={handleRemoveFromBoard}
      />

      {/* 右側：詳細表示 */}
      <BoardRightPanel
        isOpen={
          selectedMemo !== null ||
          selectedTask !== null ||
          rightPanelMode !== null
        }
        boardId={boardId}
        selectedMemo={selectedMemo}
        selectedTask={selectedTask}
        rightPanelMode={rightPanelMode}
        selectedItemsFromList={selectedItemsFromList}
        allMemos={boardMemos}
        allTasks={boardTasks}
        onClose={rightPanelMode ? () => handleCloseRightPanel(onClearSelection) : handleCloseDetail}
        onSelectMemo={onSelectMemo}
        onSelectTask={onSelectTask}
        onAddSelectedItems={handleAddSelectedItems}
        onToggleItemSelection={handleToggleItemSelection}
        onMemoDeleteAndSelectNext={handleMemoDeleteAndSelectNext}
        onTaskDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
        onMemoRestoreAndSelectNext={handleMemoRestoreAndSelectNext}
        onTaskRestoreAndSelectNext={handleTaskRestoreAndSelectNext}
        onAddMemoToBoard={handleAddMemoToBoard}
        onAddTaskToBoard={handleAddTaskToBoard}
      />
    </div>
  );
}

export default memo(BoardDetailScreen);
