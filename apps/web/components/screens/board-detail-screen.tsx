import BoardMemoSection from "@/components/features/board/board-memo-section";
import BoardRightPanel from "@/components/features/board/board-right-panel";
import BoardTaskSection from "@/components/features/board/board-task-section";
import DesktopUpper from "@/components/layout/desktop-upper";
import Tooltip from "@/components/ui/base/tooltip";
import {
  useAddItemToBoard,
  useBoardWithItems,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { useBoardState } from "@/src/hooks/use-board-state";
import { useExport } from "@/src/hooks/use-export";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { memo, useCallback, useEffect, useState } from "react";
import BoardHeader from "@/components/features/board/board-header";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";

interface BoardDetailProps {
  boardId: number;
  onBack: () => void;
  selectedMemo?: Memo | null;
  selectedTask?: Task | null;
  onSelectMemo?: (memo: Memo | null) => void;
  onSelectTask?: (task: Task | null) => void;
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
  const [checkedMemos, setCheckedMemos] = useState<Set<number>>(new Set());
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());

  // 選択ハンドラー
  const handleMemoSelectionToggle = useCallback((memoId: number) => {
    setCheckedMemos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memoId)) {
        newSet.delete(memoId);
      } else {
        newSet.add(memoId);
      }
      return newSet;
    });
  }, []);

  const handleTaskSelectionToggle = useCallback((taskId: number) => {
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
  }, []);



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
  
  const removeItemFromBoard = useRemoveItemFromBoard();
  const addItemToBoard = useAddItemToBoard();
  const { exportBoard } = useExport();

  // boardWithItemsからメモとタスクを抽出（APIコール削減）
  const boardMemos = boardWithItems?.items
    ?.filter(item => item.itemType === 'memo')
    ?.map(item => item.content as Memo) || [];
  
  const boardTasks = boardWithItems?.items
    ?.filter(item => item.itemType === 'task')
    ?.map(item => item.content as Task) || [];




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
          itemId: item.itemId,
          itemType: item.itemType,
        });
        // 削除したアイテムが選択されていた場合、選択を解除
        if (
          item.itemType === "memo" &&
          selectedMemo &&
          selectedMemo.id === item.itemId
        ) {
          onClearSelection?.();
        } else if (
          item.itemType === "task" &&
          selectedTask &&
          selectedTask.id === item.itemId
        ) {
          onClearSelection?.();
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    }
  };

  const handleSelectMemo = useCallback(
    (memo: Memo) => {
      console.log(
        "🟣 handleSelectMemo called with:",
        memo.id,
        "rightPanelMode:",
        rightPanelMode
      );
      setRightPanelMode(null); // リストモードを解除
      onSelectMemo?.(memo);
    },
    [onSelectMemo, rightPanelMode, setRightPanelMode]
  );

  const handleSelectTask = useCallback(
    (task: Task) => {
      console.log(
        "🔷 handleSelectTask called with:",
        task.id,
        "rightPanelMode:",
        rightPanelMode
      );
      setRightPanelMode(null); // リストモードを解除
      onSelectTask?.(task);
    },
    [onSelectTask, rightPanelMode, setRightPanelMode]
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
        (itemId) => !existingItemIds.includes(itemId)
      );

      if (itemsToAdd.length === 0) {
        alert("選択されたアイテムは既にボードに追加されています");
        return;
      }

      const promises = itemsToAdd.map((itemId) => {
        return addItemToBoard.mutateAsync({
          boardId,
          data: { itemType, itemId },
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
  const allMemoItems =
    boardWithItems?.items.filter((item) => item.itemType === "memo") || [];
  const allTaskItems =
    boardWithItems?.items.filter((item) => item.itemType === "task") || [];

  // アクティブタブに応じてメモをフィルタリング
  const memoItems = allMemoItems.filter(() => {
    if (activeMemoTab === "deleted") {
      // 削除済みは将来的に別のAPIから取得予定、現在は空配列
      return false;
    }
    return true; // normal の場合はすべて表示
  });

  // アクティブタブに応じてタスクをフィルタリング
  const taskItems = allTaskItems.filter((item) => {
    const task = item.content as Task;
    if (activeTaskTab === "deleted") {
      // 削除済みは将来的に別のAPIから取得予定、現在は空配列
      return false;
    }
    return task.status === activeTaskTab;
  });

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
  const deletedCount = 0; // 削除済みタスクの件数（将来実装）

  // メモの件数を計算
  const normalMemoCount = allMemoItems.length;
  const deletedMemoCount = 0; // 削除済みメモの件数（将来実装）

  // 全選択/全解除機能（統合）
  const handleSelectAll = useCallback(() => {
    const currentMemoIds = memoItems.map(item => (item.content as Memo).id);
    const currentTaskIds = taskItems.map(item => (item.content as Task).id);
    
    // すべて選択されているかチェック
    const allMemosSelected = currentMemoIds.length > 0 && checkedMemos.size === currentMemoIds.length;
    const allTasksSelected = currentTaskIds.length > 0 && checkedTasks.size === currentTaskIds.length;
    const allSelected = allMemosSelected && allTasksSelected;
    
    if (allSelected) {
      // 全解除
      setCheckedMemos(new Set());
      setCheckedTasks(new Set());
    } else {
      // 全選択
      setCheckedMemos(new Set(currentMemoIds));
      setCheckedTasks(new Set(currentTaskIds));
    }
  }, [memoItems, taskItems, checkedMemos.size, checkedTasks.size]);

  const handleMemoSelectAll = useCallback(() => {
    const currentMemoIds = memoItems.map(item => (item.content as Memo).id);
    if (checkedMemos.size === currentMemoIds.length) {
      setCheckedMemos(new Set());
    } else {
      setCheckedMemos(new Set(currentMemoIds));
    }
  }, [memoItems, checkedMemos.size]);

  const handleTaskSelectAll = useCallback(() => {
    const currentTaskIds = taskItems.map(item => (item.content as Task).id);
    if (checkedTasks.size === currentTaskIds.length) {
      setCheckedTasks(new Set());
    } else {
      setCheckedTasks(new Set(currentTaskIds));
    }
  }, [taskItems, checkedTasks.size]);

  // 全選択状態の計算
  const isMemoAllSelected = memoItems.length > 0 && checkedMemos.size === memoItems.length;
  const isTaskAllSelected = taskItems.length > 0 && checkedTasks.size === taskItems.length;
  const isAllSelected = (!showMemo || isMemoAllSelected) && (!showTask || isTaskAllSelected);

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
            onMemoSelectionModeChange={handleSelectionModeChange}
            onMemoSelectionToggle={handleMemoSelectionToggle}
            onSelectAll={handleMemoSelectAll}
            isAllSelected={isMemoAllSelected}
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
            onTaskSelectionModeChange={handleSelectionModeChange}
            onTaskSelectionToggle={handleTaskSelectionToggle}
            onSelectAll={handleTaskSelectAll}
            isAllSelected={isTaskAllSelected}
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
      />
    </div>
  );
}

export default memo(BoardDetailScreen);
