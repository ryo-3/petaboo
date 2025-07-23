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
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { memo, useCallback, useEffect, useState } from "react";
import BoardHeader from "@/components/features/board/board-header";
import { useBulkDelete, BulkDeleteConfirmation } from "@/components/ui/modals";
import { DeletionWarningMessage } from "@/components/ui/modals/deletion-warning-message";
import { useDeleteNote } from "@/src/hooks/use-notes";
import { useDeleteTask } from "@/src/hooks/use-tasks";
import { getNextItemAfterDeletion, getMemoDisplayOrder, getTaskDisplayOrder } from "@/src/utils/domUtils";

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

  // 一括削除機能
  const bulkDelete = useBulkDelete();
  const [deletingItemType, setDeletingItemType] = useState<'memo' | 'task' | null>(null);
  const [isMemoDeleting, setIsMemoDeleting] = useState(false);
  const [isTaskDeleting, setIsTaskDeleting] = useState(false);
  const deleteNoteMutation = useDeleteNote();
  const deleteTaskMutation = useDeleteTask();



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
  const memoItems = activeMemoTab === "deleted" 
    ? (boardDeletedItems?.memos || []).map((memo, index) => ({
        id: memo.id,
        boardId: boardId,
        itemId: memo.originalId,
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
        itemId: task.originalId,
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
    console.log('🎯 handleTaskDeleteAndSelectNext 開始', { deletedTaskId: deletedTask.id, taskItemsCount: taskItems.length });
    if (!onSelectTask) return;
    
    const displayOrder = getTaskDisplayOrder();
    const allTasks = taskItems.map(item => item.content as Task);
    console.log('🎯 displayOrder:', displayOrder);
    console.log('🎯 allTasks:', allTasks.map(t => ({ id: t.id, title: t.title })));
    
    const nextTask = getNextItemAfterDeletion(
      allTasks,
      deletedTask,
      displayOrder
    );
    
    console.log('🎯 nextTask found:', nextTask ? { id: nextTask.id, title: nextTask.title } : null);
    
    if (nextTask) {
      console.log('🎯 selecting nextTask:', nextTask.id);
      onSelectTask(nextTask);
    } else {
      console.log('🎯 no nextTask, clearing selection');
      onClearSelection?.();
    }
  }, [taskItems, onSelectTask, onClearSelection]);


  const handleMemoSelectAll = useCallback(() => {
    const currentMemoIds = memoItems.map((item) => (item.content as Memo).id);
    if (checkedMemos.size === currentMemoIds.length) {
      setCheckedMemos(new Set());
    } else {
      setCheckedMemos(new Set(currentMemoIds));
    }
  }, [memoItems, checkedMemos.size]);

  const handleTaskSelectAll = useCallback(() => {
    const currentTaskIds = taskItems.map((item) => (item.content as Task).id);
    if (checkedTasks.size === currentTaskIds.length) {
      setCheckedTasks(new Set());
    } else {
      setCheckedTasks(new Set(currentTaskIds));
    }
  }, [taskItems, checkedTasks.size]);

  // 全選択状態の計算
  const isMemoAllSelected = memoItems.length > 0 && checkedMemos.size === memoItems.length;
  const isTaskAllSelected = taskItems.length > 0 && checkedTasks.size === taskItems.length;

  // ステータス別カウントを取得する関数（ボード版）
  const getBoardItemStatusBreakdown = (itemIds: number[], itemType: 'memo' | 'task') => {
    if (itemType === 'memo') {
      return [{ status: 'normal', label: '通常', count: itemIds.length, color: 'bg-gray-400' }];
    } else {
      const allTasks = boardTasks;
      const selectedTasks = allTasks.filter(task => itemIds.includes(task.id));
      
      const todoCount = selectedTasks.filter(task => task.status === 'todo').length;
      const inProgressCount = selectedTasks.filter(task => task.status === 'in_progress').length;
      const completedCount = selectedTasks.filter(task => task.status === 'completed').length;
      
      const breakdown = [];
      if (todoCount > 0) breakdown.push({ status: 'todo', label: '未着手', count: todoCount, color: 'bg-zinc-400' });
      if (inProgressCount > 0) breakdown.push({ status: 'in_progress', label: '進行中', count: inProgressCount, color: 'bg-blue-500' });
      if (completedCount > 0) breakdown.push({ status: 'completed', label: '完了', count: completedCount, color: 'bg-green-500' });
      
      return breakdown;
    }
  };

  // 削除メッセージコンポーネント
  const BoardDeleteMessage = ({ itemIds, itemType }: { itemIds: number[]; itemType: 'memo' | 'task' }) => {
    const statusBreakdown = getBoardItemStatusBreakdown(itemIds, itemType);
    const isLimited = itemIds.length > 100;
    const itemTypeName = itemType === 'memo' ? 'メモ' : 'タスク';
    
    return (
      <div>
        <div className="text-sm text-gray-700 mb-3">
          選択した{itemTypeName}をボードから削除しますか？
        </div>
        <DeletionWarningMessage
          hasOtherTabItems={false}
          isLimited={isLimited}
          statusBreakdown={statusBreakdown}
          showStatusBreakdown={true}
        />
        <div className="text-xs text-gray-600 mt-2">
          ※{itemTypeName}自体は削除されず、このボードからのみ除外されます
        </div>
      </div>
    );
  };

  // 一括削除ハンドラー
  const handleBulkDelete = useCallback(async (itemType: 'memo' | 'task') => {
    const targetIds = itemType === 'memo' ? Array.from(checkedMemos) : Array.from(checkedTasks);
    
    if (targetIds.length === 0) return;

    // 削除対象のアイテムタイプを設定
    setDeletingItemType(itemType);
    
    // アニメーション開始（モーダル表示前）
    if (itemType === 'memo') {
      setIsMemoDeleting(true);
    } else {
      setIsTaskDeleting(true);
    }

    await bulkDelete.confirmBulkDelete(
      targetIds,
      1, // 1件からモーダル表示
      async (ids: number[]) => {
        try {
          // 実際の削除処理
          for (const id of ids) {
            if (itemType === 'memo') {
              await deleteNoteMutation.mutateAsync(id);
            } else {
              await deleteTaskMutation.mutateAsync(id);
            }
          }
          
          // 削除完了後に選択をクリア
          if (itemType === 'memo') {
            setCheckedMemos(new Set());
          } else {
            setCheckedTasks(new Set());
          }
        } catch (error) {
          console.error("Failed to delete items:", error);
        } finally {
          // 削除状態をfalseに設定（アニメーション終了）
          if (itemType === 'memo') {
            setIsMemoDeleting(false);
          } else {
            setIsTaskDeleting(false);
          }
          // 削除完了後にアイテムタイプをクリア
          setDeletingItemType(null);
        }
      },
      <BoardDeleteMessage itemIds={targetIds} itemType={itemType} />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedMemos, checkedTasks, bulkDelete, deleteNoteMutation, deleteTaskMutation]);

  // ボードから外す処理
  const handleRemoveFromBoard = useCallback(async () => {
    const targetIds = deletingItemType === 'memo' ? Array.from(checkedMemos) : Array.from(checkedTasks);
    
    try {
      // ボードからアイテムを削除
      for (const id of targetIds) {
        await removeItemFromBoard.mutateAsync({
          boardId,
          itemId: id,
          itemType: deletingItemType!,
        });
        
        // 削除したアイテムが現在選択されていた場合、エディターを閉じる
        if (deletingItemType === 'memo' && selectedMemo && selectedMemo.id === id) {
          onClearSelection?.();
        } else if (deletingItemType === 'task' && selectedTask && selectedTask.id === id) {
          onClearSelection?.();
        }
      }
      
      // 削除完了後に選択をクリア
      if (deletingItemType === 'memo') {
        setCheckedMemos(new Set());
      } else {
        setCheckedTasks(new Set());
      }
      
      // モーダルを閉じる
      bulkDelete.handleCancel();
    } catch (error) {
      console.error("Failed to remove items from board:", error);
    } finally {
      // 削除完了後にアイテムタイプをクリア
      setDeletingItemType(null);
    }
  }, [deletingItemType, checkedMemos, checkedTasks, removeItemFromBoard, boardId, bulkDelete, selectedMemo, selectedTask, onClearSelection]);

  // 削除モーダル（タイトルをカスタマイズ）
  const DeleteModal = () => {
    // タイトルのカスタマイズ
    const itemTypeName = deletingItemType === 'memo' ? 'メモ' : 'タスク';
    const customTitle = `${itemTypeName}の操作を選択`;
    
    return (
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
        position="center"
        customTitle={customTitle}
        showRemoveFromBoard={true}
        onRemoveFromBoard={handleRemoveFromBoard}
      />
    );
  };

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
            onBulkDelete={handleBulkDelete}
            isDeleting={isMemoDeleting}
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
            onBulkDelete={handleBulkDelete}
            isDeleting={isTaskDeleting}
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
      <DeleteModal />

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
      />
    </div>
  );
}

export default memo(BoardDetailScreen);
