import BoardMemoSection from "@/components/features/board/board-memo-section";
import BoardRightPanel from "@/components/features/board/board-right-panel";
import BoardTaskSection from "@/components/features/board/board-task-section";
import DesktopUpper from "@/components/layout/desktop-upper";
import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import { PanelBackButton } from "@/components/ui/buttons/panel-back-button";
import { getContinuousCreateMode } from "@/components/ui/buttons/continuous-create-button";
import { useBoardState } from "@/src/hooks/use-board-state";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import { useTeamContext } from "@/contexts/team-context";
import { useDeletedMemos, useDeleteMemo } from "@/src/hooks/use-memos";
import { useDeleteTask, useDeletedTasks } from "@/src/hooks/use-tasks";
import {
  useBoards,
  useAddItemToBoard,
  useItemBoards,
  useTeamItemBoards,
} from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import type { Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { OriginalIdUtils } from "@/src/types/common";
import { memo, useEffect, useState, useRef, useCallback, useMemo } from "react";
import TagAddModal from "@/components/ui/tag-add/tag-add-modal";
import BoardHeader from "@/components/features/board/board-header";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import { useBoardSelectAll } from "@/src/hooks/use-board-select-all";
import { useMultiSelection } from "@/src/hooks/use-multi-selection";
import { useBulkDeleteOperations } from "@/src/hooks/use-bulk-delete-operations";
import { useBoardItems } from "@/src/hooks/use-board-items";
import { useBoardOperations } from "@/src/hooks/use-board-operations";
import { CSVImportModal } from "@/components/features/board/csv-import-modal";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import BoardCategoryChip from "@/components/features/board-categories/board-category-chip";
import { useUserInfo } from "@/src/hooks/use-user-info";
import { getUserAvatarColor } from "@/src/utils/userUtils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/base/resizable";
import CommentSection from "@/components/features/comments/comment-section";
import type { TeamMember } from "@/src/hooks/use-team-detail";

interface BoardDetailProps {
  boardId: number;
  selectedMemo?: Memo | DeletedMemo | null;
  selectedTask?: Task | DeletedTask | null;
  onSelectMemo?: (memo: Memo | DeletedMemo | null) => void;
  onSelectTask?: (task: Task | DeletedTask | null) => void;
  onSelectDeletedMemo?: (memo: DeletedMemo | null) => void;
  onClearSelection?: () => void;
  onBack?: () => void;
  onSettings?: () => void;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
  showBoardHeader?: boolean;
  serverInitialTitle?: string;
  boardCompleted?: boolean;
  isDeleted?: boolean;
  teamMembers?: TeamMember[];
}

function BoardDetailScreen({
  boardId,
  selectedMemo: propSelectedMemo,
  selectedTask: propSelectedTask,
  onSelectMemo,
  onSelectTask,
  onSelectDeletedMemo,
  onClearSelection,
  onBack, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSettings,
  initialBoardName,
  initialBoardDescription,
  showBoardHeader = true,
  serverInitialTitle,
  boardCompleted = false,
  isDeleted = false,
  teamMembers = [],
}: BoardDetailProps) {
  const { isTeamMode: teamMode, teamId } = useTeamContext();
  // CSVインポートモーダル状態
  const [isCSVImportModalOpen, setIsCSVImportModalOpen] = useState(false);

  // ボード選択モーダル状態
  const [selectionMenuType, setSelectionMenuType] = useState<"memo" | "task">(
    "memo",
  );

  // タグ追加モーダル状態
  const [isTagAddModalOpen, setIsTagAddModalOpen] = useState(false);
  const [tagSelectionMenuType, setTagSelectionMenuType] = useState<
    "memo" | "task"
  >("memo");

  // ボードに追加のAPI
  const addItemToBoard = useAddItemToBoard();

  // 削除ボタンのref
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);

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
    showComment,
    setRightPanelMode,
    setViewMode,
    setColumnCount,
    setShowEditDate,
    handleBoardLayoutChange,
    handleSettings,
    handleMemoToggle,
    handleTaskToggle,
    handleCommentToggle,
    handleTaskTabChange,
    handleMemoTabChange,
    handleToggleItemSelection,
    handleCloseRightPanel,
    createNewMemoHandler,
    createNewTaskHandler,
    setShowTabText,
  } = useBoardState();

  // タグ表示管理
  const [showTags, setShowTags] = useState(false);

  const handleTagDisplayChange = (show: boolean) => {
    setShowTags(show);
  };

  // propsから選択状態を使用（Fast Refresh対応）
  const selectedMemo = propSelectedMemo;
  const selectedTask = propSelectedTask;

  // 削除済みメモデータを取得（復元時の総数判定用）
  const { data: deletedMemos } = useDeletedMemos({
    teamMode,
    teamId: teamId || undefined,
  });

  // 削除済みタスクデータを取得（復元時の総数判定用）
  const { data: deletedTasks } = useDeletedTasks({
    teamMode,
    teamId: teamId || undefined,
  });

  // 複数選択状態管理フック
  const {
    selectionMode,
    handleSelectionModeChange,
    checkedMemos,
    setCheckedMemos,
    handleMemoSelectionToggle,
    checkedTasks,
    setCheckedTasks,
    handleTaskSelectionToggle,
    // 互換性のため
    checkedNormalMemos,
    setCheckedNormalMemos,
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    checkedTodoTasks,
    checkedInProgressTasks,
    checkedCompletedTasks,
    checkedDeletedTasks,
  } = useMultiSelection({ activeMemoTab, activeTaskTab });

  // 削除済みタブでの選択モード自動切り替え（完全に無効化）
  // ユーザーの手動選択を尊重し、自動切り替えは行わない

  // 一括削除操作フック
  const {
    isMemoDeleting,
    isMemoLidOpen,
    isTaskDeleting,
    isTaskLidOpen,
    deletingItemType,
    bulkDelete,
    handleBulkDelete,
    handleRemoveFromBoard,
    setDeletingItemType,
    setIsMemoDeleting,
    setIsMemoLidOpen,
    setIsTaskDeleting,
    setIsTaskLidOpen,
    bulkAnimation,
    currentMemoDisplayCount,
    currentTaskDisplayCount,
    getModalStatusBreakdown,
    getHasOtherTabItems,
  } = useBulkDeleteOperations({
    boardId,
    checkedMemos,
    checkedTasks,
    setCheckedMemos,
    setCheckedTasks,
    deleteButtonRef,
    activeMemoTab,
    activeTaskTab,
    checkedNormalMemos,
    checkedDeletedMemos,
    checkedTodoTasks,
    checkedInProgressTasks,
    checkedCompletedTasks,
    checkedDeletedTasks,
    teamMode,
    teamId: teamId || undefined,
  });

  // タブテキスト表示制御
  useEffect(() => {
    // チームモードではrightPanelModeの影響を無効化
    const effectiveRightPanelMode = teamMode ? null : rightPanelMode;
    if (selectedMemo || selectedTask || effectiveRightPanelMode) {
      // 右パネルが開いたらすぐにテキストを非表示
      setShowTabText(false);
    } else {
      // 右パネルが閉じたら300ms後にテキストを表示
      const timer = setTimeout(() => {
        setShowTabText(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMemo, selectedTask, rightPanelMode, setShowTabText, teamMode]);

  // 計算されたカラム数（エディター表示時にメモ・タスク両方表示なら1列、その他は最大2列に制限）
  const effectiveColumnCount =
    (selectedMemo || selectedTask) && showMemo && showTask
      ? 1
      : selectedMemo || selectedTask || (!teamMode && rightPanelMode)
        ? columnCount <= 2
          ? columnCount
          : 2
        : columnCount;

  // ボード操作フック
  const {
    boardWithItems,
    boardDeletedItems,
    isLoading,
    error,
    boardName,
    boardDescription,
    boardMemos,
    boardTasks,
    handleExport,
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
  } = useBoardOperations({
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
    memoItems: [], // ここでは空で、後でuseBoardItemsから取得
    taskItems: [], // ここでは空で、後でuseBoardItemsから取得
    teamId: teamId?.toString() || undefined,
  });

  // メモ削除フック
  const deleteMemoMutation = useDeleteMemo({
    teamMode,
    teamId: teamId || undefined,
  });

  // タスク削除フック
  const deleteTaskMutation = useDeleteTask({
    teamMode,
    teamId: teamId || undefined,
  });

  // メモ削除と次選択を組み合わせたハンドラー
  const handleMemoDeleteWithNextSelection = useCallback(
    async (memoToDelete: Memo) => {
      try {
        // 実際の削除API呼び出し
        await deleteMemoMutation.mutateAsync(memoToDelete.id);

        // 削除完了後に次選択ロジックを実行
        handleMemoDeleteAndSelectNext(memoToDelete);
      } catch (error) {}
    },
    [deleteMemoMutation, handleMemoDeleteAndSelectNext, teamMode, teamId],
  );

  // タスク削除と次選択を組み合わせたハンドラー
  const handleTaskDeleteWithNextSelection = useCallback(
    async (taskToDelete: Task) => {
      try {
        // 実際の削除API呼び出し
        await deleteTaskMutation.mutateAsync(taskToDelete.id);

        // 削除完了後に次選択ロジックを実行
        handleTaskDeleteAndSelectNext(taskToDelete);
      } catch (error) {}
    },
    [deleteTaskMutation, handleTaskDeleteAndSelectNext, teamMode, teamId],
  );

  // ボードアイテムの計算とフィルタリング
  const {
    allMemoItems,
    allTaskItems,
    memoItems,
    taskItems,
    normalMemoCount,
    deletedMemoCount,
    todoCount,
    inProgressCount,
    completedCount,
    deletedCount,
  } = useBoardItems({
    boardId,
    boardWithItems,
    boardDeletedItems,
    activeMemoTab,
    activeTaskTab,
    checkedNormalMemos,
    checkedDeletedMemos,
    setCheckedNormalMemos,
    setCheckedDeletedMemos,
    isMemoDeleting,
  });

  // 全データ事前取得（ちらつき解消）
  const { data: personalTaggings } = useAllTaggings({ enabled: !teamMode });
  const { data: teamTaggings } = useAllTeamTaggings(teamId || 0, {
    enabled: teamMode,
  });
  const { data: allBoardItems } = useAllBoardItems(
    teamMode ? teamId || undefined : undefined,
  );
  const { data: personalTags } = useTags({ enabled: !teamMode });
  const { data: teamTags } = useTeamTags(teamId || 0, { enabled: teamMode });
  const { data: personalBoards } = useBoards("normal", !teamMode);
  const { data: teamBoards } = useTeamBoards(teamId, "normal");

  // チームモードかどうかでタグ付けデータを切り替え
  const allTaggings = teamMode && teamId ? teamTaggings : personalTaggings;

  // チームモードかどうかでタグを切り替え
  const allTags = teamMode && teamId ? teamTags : personalTags;

  // チームモードかどうかでボード一覧を切り替え
  const allBoards = teamMode ? teamBoards : personalBoards;
  const { categories } = useBoardCategories();

  // 選択中のメモ・タスクに紐づくボード情報を取得
  const selectedMemoId = OriginalIdUtils.fromItem(selectedMemo);
  const selectedTaskId = OriginalIdUtils.fromItem(selectedTask);

  // 個人モード用のitemBoards取得
  const { data: personalMemoItemBoards = [] } = useItemBoards(
    "memo",
    teamMode ? undefined : selectedMemoId,
  );
  const { data: personalTaskItemBoards = [] } = useItemBoards(
    "task",
    teamMode ? undefined : selectedTaskId,
  );

  // チームモード用のitemBoards取得
  const { data: teamMemoItemBoards = [] } = useTeamItemBoards(
    teamMode ? teamId || 0 : 0,
    "memo",
    teamMode ? selectedMemoId : undefined,
  );
  const { data: teamTaskItemBoards = [] } = useTeamItemBoards(
    teamMode ? teamId || 0 : 0,
    "task",
    teamMode ? selectedTaskId : undefined,
  );

  // 完全なitemBoards配列（API取得 + initialBoardId考慮）
  const completeItemBoards = useMemo(() => {
    if (!selectedMemo && !selectedTask) return [];

    if (selectedMemo) {
      const itemBoards = teamMode ? teamMemoItemBoards : personalMemoItemBoards;

      // initialBoardIdがあり、まだitemBoardsに含まれていない場合は追加
      if (boardId) {
        const boardExists = itemBoards.some(
          (board: Board) => board.id === boardId,
        );
        if (!boardExists && allBoards) {
          const initialBoard = allBoards.find((board) => board.id === boardId);
          if (initialBoard) {
            return [...itemBoards, initialBoard];
          }
        }
      }

      return itemBoards;
    }

    if (selectedTask) {
      const itemBoards = teamMode ? teamTaskItemBoards : personalTaskItemBoards;

      // initialBoardIdがあり、まだitemBoardsに含まれていない場合は追加
      if (boardId) {
        const boardExists = itemBoards.some(
          (board: Board) => board.id === boardId,
        );
        if (!boardExists && allBoards) {
          const initialBoard = allBoards.find((board) => board.id === boardId);
          if (initialBoard) {
            return [...itemBoards, initialBoard];
          }
        }
      }

      return itemBoards;
    }

    return [];
  }, [
    selectedMemo,
    selectedTask,
    selectedMemoId,
    selectedTaskId,
    teamMode,
    teamId,
    teamMemoItemBoards,
    personalMemoItemBoards,
    teamTaskItemBoards,
    personalTaskItemBoards,
    boardId,
    allBoards,
  ]);

  // ユーザー情報取得（コメント入力欄のアバター表示用）
  const { data: userInfo } = useUserInfo();

  // 選択時のパネル幅の状態管理
  const [panelSizesSelected, setPanelSizesSelected] = useState<{
    left: number;
    center: number;
    right: number;
  }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("team-board-panel-sizes-selected");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // パース失敗時はデフォルト値
        }
      }
    }
    return { left: 25, center: 45, right: 30 };
  });

  // 非選択時のパネル幅の状態管理
  const [panelSizesUnselected, setPanelSizesUnselected] = useState<{
    left: number;
    center: number;
    right: number;
  }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("team-board-panel-sizes-unselected");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // パース失敗時はデフォルト値
        }
      }
    }
    return { left: 33, center: 34, right: 33 };
  });

  // 初回マウント判定用
  const mountCountSelected = useRef(0);
  const mountCountUnselected = useRef(0);

  // 選択状態が変わったらカウントをリセット
  useEffect(() => {
    mountCountSelected.current = 0;
  }, [selectedMemo, selectedTask]);

  useEffect(() => {
    // 非選択状態になったらカウントをリセット
    if (!selectedMemo && !selectedTask) {
      mountCountUnselected.current = 0;
    }
  }, [selectedMemo, selectedTask]);

  // デバウンス用のタイマー
  const saveTimerSelected = useRef<NodeJS.Timeout>();
  const saveTimerUnselected = useRef<NodeJS.Timeout>();

  // 選択時のパネル幅変更時にローカルストレージへ保存（デバウンス）
  const handlePanelResizeSelected = useCallback((sizes: number[]) => {
    // 初回マウント時はスキップ（選択状態切り替え時の誤保存を防ぐ）
    mountCountSelected.current++;
    if (mountCountSelected.current <= 1) {
      return;
    }

    if (
      sizes.length === 3 &&
      sizes[0] !== undefined &&
      sizes[1] !== undefined &&
      sizes[2] !== undefined
    ) {
      const newSizes = {
        left: sizes[0],
        center: sizes[1],
        right: sizes[2],
      };

      // 前のタイマーをクリア
      if (saveTimerSelected.current) {
        clearTimeout(saveTimerSelected.current);
      }

      // 500ms後に保存
      saveTimerSelected.current = setTimeout(() => {
        setPanelSizesSelected(newSizes);
        localStorage.setItem(
          "team-board-panel-sizes-selected",
          JSON.stringify(newSizes),
        );
      }, 500);
    }
  }, []);

  // 非選択時のパネル幅変更時にローカルストレージへ保存（デバウンス）
  const handlePanelResizeUnselected = useCallback((sizes: number[]) => {
    // 初回マウント時はスキップ
    mountCountUnselected.current++;
    if (mountCountUnselected.current <= 1) {
      return;
    }

    if (
      sizes.length === 3 &&
      sizes[0] !== undefined &&
      sizes[1] !== undefined &&
      sizes[2] !== undefined
    ) {
      const newSizes = {
        left: sizes[0],
        center: sizes[1],
        right: sizes[2],
      };

      // 前のタイマーをクリア
      if (saveTimerUnselected.current) {
        clearTimeout(saveTimerUnselected.current);
      }

      // 500ms後に保存
      saveTimerUnselected.current = setTimeout(() => {
        setPanelSizesUnselected(newSizes);
        localStorage.setItem(
          "team-board-panel-sizes-unselected",
          JSON.stringify(newSizes),
        );
      }, 500);
    }
  }, []);

  // 安全なデータ配布用（初期レンダリング時のundefined対策）
  const safeAllTaggings = allTaggings || [];
  const safeAllBoardItems = allBoardItems || [];
  const safeAllTags = allTags || [];
  const safeAllBoards = allBoards || [];

  // ボードのカテゴリーを取得
  const boardCategory = boardWithItems?.boardCategoryId
    ? categories.find((cat) => cat.id === boardWithItems.boardCategoryId)
    : null;

  // メモの全選択フック
  const {
    isAllSelected: isMemoAllSelected,
    handleSelectAll: handleMemoSelectAll,
  } = useBoardSelectAll({
    items: memoItems,
    checkedItems: checkedMemos,
    setCheckedItems: setCheckedMemos,
    getItemId: (item) => {
      // 個別選択との統一性のため、content.idを使用
      return item.content?.id || item.itemId || item.id;
    },
  });

  // タスクの全選択フック（メモと同じ方式）
  const {
    isAllSelected: isTaskAllSelected,
    handleSelectAll: handleTaskSelectAll,
  } = useBoardSelectAll({
    items: taskItems,
    checkedItems: checkedTasks,
    setCheckedItems: setCheckedTasks,
    getItemId: (item) => {
      // 個別選択との統一性のため、content.idを使用
      return item.content?.id || item.itemId || item.id;
    },
  });

  // 選択メニュー関連のハンドラー

  // タグ追加関連のハンドラー
  const handleTaggingMemo = useCallback(() => {
    setTagSelectionMenuType("memo");
    setIsTagAddModalOpen(true);
  }, []);

  const handleTaggingTask = useCallback(() => {
    setTagSelectionMenuType("task");
    setIsTagAddModalOpen(true);
  }, []);

  // 拡張されたタブ変更ハンドラー（削除済タブでキャッシュ更新）
  const handleMemoTabChangeWithRefresh = async (tab: "normal" | "deleted") => {
    if (tab === "deleted") {
      await refetchDeletedItems();
    }
    handleMemoTabChange(tab);
  };

  const handleTaskTabChangeWithRefresh = async (
    tab: "todo" | "in_progress" | "completed" | "deleted",
  ) => {
    if (tab === "deleted") {
      await refetchDeletedItems();
    }
    handleTaskTabChange(tab);
  };

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
    <div className="flex h-full bg-white overflow-x-auto overflow-y-hidden">
      {/* 左側：メモ・タスク一覧 */}
      <div
        className={`${
          teamMode
            ? "w-full" // チームモード時は常に100%幅
            : selectedMemo || selectedTask || rightPanelMode
              ? rightPanelMode
                ? "w-[44%] min-w-[600px] border-r border-gray-300" // リスト表示時
                : "w-[44%] min-w-[600px] border-r border-gray-300" // エディター表示時
              : "w-full"
        } ${teamMode ? "" : "pt-3"} pl-5 pr-4 ${!teamMode && (selectedMemo || selectedTask || rightPanelMode) ? "pr-2" : "pr-4"} flex flex-col transition-all duration-300 relative`}
      >
        {/* チームモード時はDesktopUpperを3パネル内の左パネルに配置、個人モード時は外側に配置 */}
        {!teamMode && (
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
                selectedMemo || selectedTask || rightPanelMode
                  ? "view"
                  : "hidden"
              }
              customTitle={boardName || "ボード詳細"}
              boardDescription={boardDescription}
              boardId={boardId}
              onBoardExport={handleExport}
              onBoardSettings={onSettings || handleSettings}
              isExportDisabled={false}
              marginBottom="mb-2"
              headerMarginBottom="mb-1.5"
              showEditDate={showEditDate}
              onShowEditDateChange={setShowEditDate}
              showTagDisplay={showTags}
              onShowTagDisplayChange={handleTagDisplayChange}
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
              onCsvImport={() => setIsCSVImportModalOpen(true)}
            />
          </div>
        )}

        {/* メモ・タスクコンテンツ - チームモードでは動的3パネル構成 */}
        <div
          className={`${
            teamMode
              ? "flex gap-2 flex-1 min-h-0 min-w-[1280px]"
              : !teamMode &&
                  (rightPanelMode === "memo-list" ||
                    rightPanelMode === "task-list")
                ? "flex flex-col"
                : !showMemo || !showTask || boardLayout === "vertical"
                  ? isReversed
                    ? "flex flex-col-reverse"
                    : "flex flex-col"
                  : `grid grid-cols-1 lg:grid-cols-2${isReversed ? " [&>*:nth-child(1)]:order-2 [&>*:nth-child(2)]:order-1" : ""}`
          } gap-2 flex-1 min-h-0`}
        >
          {teamMode ? (
            <>
              {selectedMemo || selectedTask
                ? /* 選択時: 動的パネル構成 */
                  (() => {
                    // 選択時は左パネル（一覧）と中央パネル（詳細）は常に表示、右パネル（コメント）のみ動的
                    const visiblePanels = 2 + (showComment ? 1 : 0);
                    // 左パネル20-50%、中央パネルは残り、コメントパネル25-50%
                    const listPanelSize = 30;
                    const detailPanelSize = showComment ? 45 : 70;
                    const commentPanelSize = 25;

                    return (
                      <ResizablePanelGroup
                        key={`selected-${visiblePanels}panel`}
                        direction="horizontal"
                        className="flex-1"
                        onLayout={handlePanelResizeSelected}
                      >
                        {/* 左パネル: 一覧（選択に応じて動的、showMemo/showTaskで制御） */}
                        {((selectedTask && showTask) ||
                          (selectedMemo && showMemo)) && (
                          <>
                            <ResizablePanel
                              id="selected-list"
                              order={1}
                              defaultSize={listPanelSize}
                              minSize={15}
                              maxSize={50}
                              className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                            >
                              <div
                                className={`flex flex-col h-full relative ${teamMode ? "pt-3" : ""}`}
                              >
                                <DesktopUpper
                                  currentMode="board"
                                  activeTab="normal"
                                  onTabChange={() => {}}
                                  onCreateNew={() => {}}
                                  viewMode={viewMode}
                                  onViewModeChange={setViewMode}
                                  columnCount={columnCount}
                                  onColumnCountChange={setColumnCount}
                                  rightPanelMode="view"
                                  customTitle={boardName || "ボード詳細"}
                                  boardDescription={boardDescription}
                                  boardId={boardId}
                                  onBoardExport={handleExport}
                                  onBoardSettings={onSettings || handleSettings}
                                  isExportDisabled={false}
                                  marginBottom="mb-0"
                                  headerMarginBottom="mb-0"
                                  showEditDate={showEditDate}
                                  onShowEditDateChange={setShowEditDate}
                                  showTagDisplay={showTags}
                                  onShowTagDisplayChange={
                                    handleTagDisplayChange
                                  }
                                  boardLayout={boardLayout}
                                  isReversed={isReversed}
                                  onBoardLayoutChange={handleBoardLayoutChange}
                                  showMemo={showMemo}
                                  showTask={showTask}
                                  showComment={showComment}
                                  onMemoToggle={handleMemoToggle}
                                  onTaskToggle={handleTaskToggle}
                                  onCommentToggle={handleCommentToggle}
                                  contentFilterRightPanelMode={rightPanelMode}
                                  normalCount={
                                    allMemoItems.length + allTaskItems.length
                                  }
                                  completedCount={completedCount}
                                  deletedCount={deletedCount + deletedMemoCount}
                                  selectionMode={selectionMode}
                                  onSelectionModeChange={
                                    handleSelectionModeChange
                                  }
                                  onSelectAll={undefined}
                                  isAllSelected={false}
                                  onCsvImport={() =>
                                    setIsCSVImportModalOpen(true)
                                  }
                                  hideControls={false}
                                  floatControls={true}
                                  teamMode={teamMode}
                                />

                                {selectedTask ? (
                                  /* タスク選択時: タスク一覧を表示 */
                                  <BoardTaskSection
                                    boardId={boardId}
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
                                    showTags={showTags}
                                    showBoardName={false}
                                    allTags={safeAllTags}
                                    allBoards={safeAllBoards}
                                    allTaggings={
                                      (safeAllTaggings || []) as Tagging[]
                                    }
                                    allBoardItems={safeAllBoardItems}
                                    selectedTask={selectedTask}
                                    onCreateNewTask={handleCreateNewTask}
                                    onSetRightPanelMode={setRightPanelMode}
                                    onTaskTabChange={
                                      handleTaskTabChangeWithRefresh
                                    }
                                    onSelectTask={handleSelectTask}
                                    taskSelectionMode={selectionMode}
                                    checkedTasks={checkedTasks}
                                    onTaskSelectionToggle={
                                      handleTaskSelectionToggle
                                    }
                                    onSelectAll={handleTaskSelectAll}
                                    isAllSelected={isTaskAllSelected}
                                    onBulkDelete={() =>
                                      handleBulkDelete("task")
                                    }
                                    isDeleting={isTaskDeleting}
                                    isLidOpen={isTaskLidOpen}
                                    currentDisplayCount={
                                      currentTaskDisplayCount
                                    }
                                    deleteButtonRef={deleteButtonRef}
                                    onCheckedTasksChange={setCheckedTasks}
                                    onTagging={handleTaggingTask}
                                  />
                                ) : (
                                  /* デフォルトまたはメモ選択時: メモ一覧を表示 */
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
                                    allTags={safeAllTags}
                                    allBoards={safeAllBoards}
                                    allTaggings={
                                      (safeAllTaggings || []) as Tagging[]
                                    }
                                    allBoardItems={safeAllBoardItems}
                                    showEditDate={showEditDate}
                                    showTags={showTags}
                                    selectedMemo={selectedMemo}
                                    boardId={boardId}
                                    onCreateNewMemo={handleCreateNewMemo}
                                    onSetRightPanelMode={setRightPanelMode}
                                    onMemoTabChange={
                                      handleMemoTabChangeWithRefresh
                                    }
                                    onSelectMemo={handleSelectMemo}
                                    memoSelectionMode={selectionMode}
                                    checkedMemos={checkedMemos}
                                    onMemoSelectionToggle={
                                      handleMemoSelectionToggle
                                    }
                                    onSelectAll={handleMemoSelectAll}
                                    isAllSelected={isMemoAllSelected}
                                    onBulkDelete={() =>
                                      handleBulkDelete("memo")
                                    }
                                    isDeleting={isMemoDeleting}
                                    isLidOpen={isMemoLidOpen}
                                    currentDisplayCount={
                                      currentMemoDisplayCount
                                    }
                                    deleteButtonRef={deleteButtonRef}
                                    onCheckedMemosChange={setCheckedMemos}
                                    onTagging={handleTaggingMemo}
                                  />
                                )}
                              </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />
                          </>
                        )}

                        {/* 中央パネル: 詳細表示 */}
                        <ResizablePanel
                          id="selected-detail"
                          order={2}
                          defaultSize={detailPanelSize}
                          minSize={35}
                          className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                        >
                          {selectedMemo ? (
                            /* メモ選択時: メモ詳細を表示 */
                            <div className="h-full flex flex-col min-h-0">
                              <MemoEditor
                                memo={selectedMemo as Memo}
                                initialBoardId={boardId}
                                onClose={onClearSelection || (() => {})}
                                customHeight="flex-1 min-h-0"
                                showDateAtBottom={true}
                                createdBy={
                                  selectedMemo && "createdBy" in selectedMemo
                                    ? selectedMemo.createdBy
                                    : null
                                }
                                createdByAvatarColor={
                                  selectedMemo && "avatarColor" in selectedMemo
                                    ? selectedMemo.avatarColor
                                    : null
                                }
                                preloadedBoardItems={allBoardItems || []}
                                preloadedBoards={
                                  teamMode
                                    ? teamBoards || []
                                    : personalBoards || []
                                }
                                preloadedItemBoards={completeItemBoards}
                                onSaveComplete={(
                                  savedMemo: Memo,
                                  wasEmpty: boolean,
                                  isNewMemo: boolean,
                                ) => {
                                  // 連続作成モードがOFFで新規メモの場合、保存されたメモを選択状態にする
                                  if (
                                    isNewMemo &&
                                    !getContinuousCreateMode(
                                      "memo-continuous-create-mode",
                                    )
                                  ) {
                                    onSelectMemo?.(savedMemo);
                                  }
                                }}
                                onDeleteAndSelectNext={(memo) => {
                                  if ("id" in memo) {
                                    handleMemoDeleteWithNextSelection(
                                      memo as Memo,
                                    );
                                  } else {
                                    console.error(
                                      "❌ 削除対象メモが不正",
                                      memo,
                                    );
                                  }
                                }}
                                onRestore={() => {
                                  console.log(
                                    "🔄 チームボード詳細 - 復元ボタンクリック",
                                    {
                                      selectedMemo,
                                      hasOriginalId:
                                        selectedMemo &&
                                        "originalId" in selectedMemo,
                                      originalId:
                                        selectedMemo &&
                                        "originalId" in selectedMemo
                                          ? (selectedMemo as DeletedMemo)
                                              .originalId
                                          : null,
                                    },
                                  );
                                  if (
                                    selectedMemo &&
                                    "originalId" in selectedMemo
                                  ) {
                                    handleMemoRestoreAndSelectNext(
                                      selectedMemo as DeletedMemo,
                                    );
                                  } else {
                                    console.error(
                                      "❌ 復元対象メモが不正",
                                      selectedMemo,
                                    );
                                  }
                                }}
                                onRestoreAndSelectNext={
                                  handleMemoRestoreAndSelectNext
                                }
                                totalDeletedCount={deletedMemos?.length || 0}
                              />
                            </div>
                          ) : selectedTask ? (
                            /* タスク選択時: タスク詳細を表示 */
                            <div className="h-full flex flex-col min-h-0">
                              <TaskEditor
                                task={selectedTask as Task}
                                initialBoardId={boardId}
                                onClose={onClearSelection || (() => {})}
                                customHeight="flex-1 min-h-0"
                                showDateAtBottom={true}
                                createdBy={
                                  selectedTask && "createdBy" in selectedTask
                                    ? selectedTask.createdBy
                                    : null
                                }
                                createdByAvatarColor={
                                  selectedTask && "avatarColor" in selectedTask
                                    ? selectedTask.avatarColor
                                    : null
                                }
                                preloadedBoardItems={allBoardItems || []}
                                preloadedBoards={
                                  teamMode
                                    ? teamBoards || []
                                    : personalBoards || []
                                }
                                preloadedItemBoards={completeItemBoards}
                                onSaveComplete={(
                                  savedTask: Task,
                                  isNewTask: boolean,
                                  isContinuousMode?: boolean,
                                ) => {
                                  // 連続作成モードがOFFで新規タスクの場合、保存されたタスクを選択状態にする
                                  if (isNewTask && !isContinuousMode) {
                                    onSelectTask?.(savedTask);
                                  }
                                }}
                                onDeleteAndSelectNext={(task) => {
                                  if ("id" in task) {
                                    handleTaskDeleteWithNextSelection(
                                      task as Task,
                                    );
                                  } else {
                                    console.error(
                                      "❌ 削除対象タスクが不正",
                                      task,
                                    );
                                  }
                                }}
                                onRestore={() => {
                                  console.log(
                                    "🔄 チームボード詳細 - タスク復元ボタンクリック",
                                    {
                                      selectedTask,
                                      hasOriginalId:
                                        selectedTask &&
                                        "originalId" in selectedTask,
                                      originalId:
                                        selectedTask &&
                                        "originalId" in selectedTask
                                          ? (selectedTask as DeletedTask)
                                              .originalId
                                          : null,
                                    },
                                  );
                                  if (
                                    selectedTask &&
                                    "originalId" in selectedTask
                                  ) {
                                    handleTaskRestoreAndSelectNext(
                                      selectedTask as DeletedTask,
                                    );
                                  } else {
                                    console.error(
                                      "❌ 復元対象タスクが不正",
                                      selectedTask,
                                    );
                                  }
                                }}
                                onRestoreAndSelectNext={() => {
                                  if (
                                    selectedTask &&
                                    "originalId" in selectedTask
                                  ) {
                                    handleTaskRestoreAndSelectNext(
                                      selectedTask as DeletedTask,
                                    );
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            /* 何も選択されていない時: タスク一覧を表示 */
                            <BoardTaskSection
                              boardId={boardId}
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
                              showTags={showTags}
                              showBoardName={false}
                              allTags={safeAllTags}
                              allBoards={safeAllBoards}
                              allTaggings={(safeAllTaggings || []) as Tagging[]}
                              allBoardItems={safeAllBoardItems}
                              selectedTask={selectedTask}
                              onCreateNewTask={handleCreateNewTask}
                              onSetRightPanelMode={setRightPanelMode}
                              onTaskTabChange={handleTaskTabChangeWithRefresh}
                              onSelectTask={handleSelectTask}
                              taskSelectionMode={selectionMode}
                              checkedTasks={checkedTasks}
                              onTaskSelectionToggle={handleTaskSelectionToggle}
                              onSelectAll={handleTaskSelectAll}
                              isAllSelected={isTaskAllSelected}
                              onBulkDelete={() => handleBulkDelete("task")}
                              isDeleting={isTaskDeleting}
                              isLidOpen={isTaskLidOpen}
                              currentDisplayCount={currentTaskDisplayCount}
                              deleteButtonRef={deleteButtonRef}
                              onCheckedTasksChange={setCheckedTasks}
                              onTagging={handleTaggingTask}
                            />
                          )}
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* 右パネル: コンテキストに応じたコメント（showCommentがtrueの場合のみ） */}
                        {showComment && (
                          <>
                            <ResizablePanel
                              id="selected-comment"
                              order={3}
                              defaultSize={commentPanelSize}
                              minSize={25}
                              className="rounded-lg bg-white pr-2 flex flex-col min-h-0"
                            >
                              <CommentSection
                                title={
                                  selectedMemo
                                    ? "メモコメント"
                                    : selectedTask
                                      ? "タスクコメント"
                                      : "ボードコメント"
                                }
                                placeholder={
                                  selectedMemo
                                    ? "メモにコメントを追加..."
                                    : selectedTask
                                      ? "タスクにコメントを追加..."
                                      : "ボードにコメントを追加..."
                                }
                                teamId={teamId || undefined}
                                boardId={boardId}
                                targetType={
                                  selectedMemo
                                    ? "memo"
                                    : selectedTask
                                      ? "task"
                                      : "board"
                                }
                                targetOriginalId={
                                  selectedMemo
                                    ? selectedMemo.originalId
                                    : selectedTask
                                      ? selectedTask.originalId
                                      : boardId.toString()
                                }
                                targetTitle={
                                  selectedMemo
                                    ? `メモ「${selectedMemo.title || "タイトルなし"}」`
                                    : selectedTask
                                      ? `タスク「${selectedTask.title || "タイトルなし"}」`
                                      : undefined
                                }
                                teamMembers={teamMembers}
                              />
                            </ResizablePanel>
                          </>
                        )}
                      </ResizablePanelGroup>
                    );
                  })()
                : /* 非選択時: 動的パネル構成 */
                  (() => {
                    // 表示されているパネルの数を計算
                    const visiblePanels = [
                      showMemo,
                      showTask,
                      showComment,
                    ].filter(Boolean).length;
                    // 最小サイズは常に25%
                    const minPanelSize = 25;

                    // 各パネルのorderを計算（表示されるパネルのみカウント）
                    let currentOrder = 0;
                    const memoPanelOrder = showMemo ? ++currentOrder : 0;
                    const taskPanelOrder = showTask ? ++currentOrder : 0;
                    const commentPanelOrder = showComment ? ++currentOrder : 0;

                    // パネルサイズを計算（2パネル時: 1番目30%, 2番目70%; 3パネル時: 均等）
                    const getPanelSize = (order: number) => {
                      if (visiblePanels === 2) {
                        return order === 1 ? 30 : 70;
                      }
                      return 100 / visiblePanels;
                    };

                    console.log("🔧 [非選択時パネル設定]", {
                      visiblePanels,
                      minPanelSize,
                      showMemo,
                      showTask,
                      showComment,
                      memoPanelOrder,
                      taskPanelOrder,
                      commentPanelOrder,
                    });

                    return (
                      <ResizablePanelGroup
                        key={`unselected-${visiblePanels}panel`}
                        direction="horizontal"
                        className="flex-1"
                        onLayout={handlePanelResizeUnselected}
                      >
                        {/* 左パネル: メモ一覧（showMemoがtrueの場合のみ） */}
                        {showMemo && (
                          <>
                            <ResizablePanel
                              id="unselected-memo"
                              order={memoPanelOrder}
                              defaultSize={getPanelSize(memoPanelOrder)}
                              minSize={minPanelSize}
                              className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                            >
                              <div
                                className={`flex flex-col h-full relative ${teamMode ? "pt-3" : ""}`}
                              >
                                <DesktopUpper
                                  currentMode="board"
                                  activeTab="normal"
                                  onTabChange={() => {}}
                                  onCreateNew={() => {}}
                                  viewMode={viewMode}
                                  onViewModeChange={setViewMode}
                                  columnCount={columnCount}
                                  onColumnCountChange={setColumnCount}
                                  rightPanelMode="hidden"
                                  customTitle={boardName || "ボード詳細"}
                                  boardDescription={boardDescription}
                                  boardId={boardId}
                                  onBoardExport={handleExport}
                                  onBoardSettings={onSettings || handleSettings}
                                  isExportDisabled={false}
                                  marginBottom="mb-0"
                                  headerMarginBottom="mb-0"
                                  showEditDate={showEditDate}
                                  onShowEditDateChange={setShowEditDate}
                                  showTagDisplay={showTags}
                                  onShowTagDisplayChange={
                                    handleTagDisplayChange
                                  }
                                  boardLayout={boardLayout}
                                  isReversed={isReversed}
                                  onBoardLayoutChange={handleBoardLayoutChange}
                                  showMemo={showMemo}
                                  showTask={showTask}
                                  showComment={showComment}
                                  onMemoToggle={handleMemoToggle}
                                  onTaskToggle={handleTaskToggle}
                                  onCommentToggle={handleCommentToggle}
                                  contentFilterRightPanelMode={rightPanelMode}
                                  normalCount={
                                    allMemoItems.length + allTaskItems.length
                                  }
                                  completedCount={completedCount}
                                  deletedCount={deletedCount + deletedMemoCount}
                                  selectionMode={selectionMode}
                                  onSelectionModeChange={
                                    handleSelectionModeChange
                                  }
                                  onSelectAll={undefined}
                                  isAllSelected={false}
                                  onCsvImport={() =>
                                    setIsCSVImportModalOpen(true)
                                  }
                                  hideControls={false}
                                  floatControls={true}
                                  teamMode={teamMode}
                                />

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
                                  allTags={safeAllTags}
                                  allBoards={safeAllBoards}
                                  allTaggings={
                                    (safeAllTaggings || []) as Tagging[]
                                  }
                                  allBoardItems={safeAllBoardItems}
                                  showEditDate={showEditDate}
                                  showTags={showTags}
                                  selectedMemo={selectedMemo}
                                  boardId={boardId}
                                  onCreateNewMemo={handleCreateNewMemo}
                                  onSetRightPanelMode={setRightPanelMode}
                                  onMemoTabChange={
                                    handleMemoTabChangeWithRefresh
                                  }
                                  onSelectMemo={handleSelectMemo}
                                  memoSelectionMode={selectionMode}
                                  checkedMemos={checkedMemos}
                                  onMemoSelectionToggle={
                                    handleMemoSelectionToggle
                                  }
                                  onSelectAll={handleMemoSelectAll}
                                  isAllSelected={isMemoAllSelected}
                                  onBulkDelete={() => handleBulkDelete("memo")}
                                  isDeleting={isMemoDeleting}
                                  isLidOpen={isMemoLidOpen}
                                  currentDisplayCount={currentMemoDisplayCount}
                                  deleteButtonRef={deleteButtonRef}
                                  onCheckedMemosChange={setCheckedMemos}
                                  onTagging={handleTaggingMemo}
                                />
                              </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />
                          </>
                        )}

                        {/* 中央パネル: タスク一覧（showTaskがtrueの場合のみ） */}
                        {showTask && (
                          <>
                            <ResizablePanel
                              id="unselected-task"
                              order={taskPanelOrder}
                              defaultSize={getPanelSize(taskPanelOrder)}
                              minSize={minPanelSize}
                              className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                            >
                              <div
                                className={`flex flex-col h-full relative ${teamMode ? "pt-3" : ""}`}
                              >
                                {!showMemo && (
                                  <DesktopUpper
                                    currentMode="board"
                                    activeTab="normal"
                                    onTabChange={() => {}}
                                    onCreateNew={() => {}}
                                    viewMode={viewMode}
                                    onViewModeChange={setViewMode}
                                    columnCount={columnCount}
                                    onColumnCountChange={setColumnCount}
                                    rightPanelMode="hidden"
                                    customTitle={boardName || "ボード詳細"}
                                    boardDescription={boardDescription}
                                    boardId={boardId}
                                    onBoardExport={handleExport}
                                    onBoardSettings={
                                      onSettings || handleSettings
                                    }
                                    isExportDisabled={false}
                                    marginBottom="mb-0"
                                    headerMarginBottom="mb-0"
                                    showEditDate={showEditDate}
                                    onShowEditDateChange={setShowEditDate}
                                    showTagDisplay={showTags}
                                    onShowTagDisplayChange={
                                      handleTagDisplayChange
                                    }
                                    boardLayout={boardLayout}
                                    isReversed={isReversed}
                                    onBoardLayoutChange={
                                      handleBoardLayoutChange
                                    }
                                    showMemo={showMemo}
                                    showTask={showTask}
                                    showComment={showComment}
                                    onMemoToggle={handleMemoToggle}
                                    onTaskToggle={handleTaskToggle}
                                    onCommentToggle={handleCommentToggle}
                                    contentFilterRightPanelMode={rightPanelMode}
                                    normalCount={
                                      allMemoItems.length + allTaskItems.length
                                    }
                                    completedCount={completedCount}
                                    deletedCount={
                                      deletedCount + deletedMemoCount
                                    }
                                    selectionMode={selectionMode}
                                    onSelectionModeChange={
                                      handleSelectionModeChange
                                    }
                                    onSelectAll={undefined}
                                    isAllSelected={false}
                                    onCsvImport={() =>
                                      setIsCSVImportModalOpen(true)
                                    }
                                    hideControls={false}
                                    floatControls={true}
                                    teamMode={teamMode}
                                  />
                                )}

                                <BoardTaskSection
                                  boardId={boardId}
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
                                  showTags={showTags}
                                  showBoardName={false}
                                  allTags={safeAllTags}
                                  allBoards={safeAllBoards}
                                  allTaggings={
                                    (safeAllTaggings || []) as Tagging[]
                                  }
                                  allBoardItems={safeAllBoardItems}
                                  selectedTask={selectedTask}
                                  onCreateNewTask={handleCreateNewTask}
                                  onSetRightPanelMode={setRightPanelMode}
                                  onTaskTabChange={
                                    handleTaskTabChangeWithRefresh
                                  }
                                  onSelectTask={handleSelectTask}
                                  taskSelectionMode={selectionMode}
                                  checkedTasks={checkedTasks}
                                  onTaskSelectionToggle={
                                    handleTaskSelectionToggle
                                  }
                                  onSelectAll={handleTaskSelectAll}
                                  isAllSelected={isTaskAllSelected}
                                  onBulkDelete={() => handleBulkDelete("task")}
                                  isDeleting={isTaskDeleting}
                                  isLidOpen={isTaskLidOpen}
                                  currentDisplayCount={currentTaskDisplayCount}
                                  deleteButtonRef={deleteButtonRef}
                                  onCheckedTasksChange={setCheckedTasks}
                                  onTagging={handleTaggingTask}
                                />
                              </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />
                          </>
                        )}

                        {/* 右パネル: ボードコメント（showCommentがtrueの場合のみ） */}
                        {showComment && (
                          <ResizablePanel
                            id="unselected-comment"
                            order={commentPanelOrder}
                            defaultSize={getPanelSize(commentPanelOrder)}
                            minSize={minPanelSize}
                            className="rounded-lg bg-white pr-2 flex flex-col min-h-0"
                          >
                            {/* コメントのみ表示時はヘッダーを追加 */}
                            {!showMemo && !showTask && (
                              <div className={`${teamMode ? "pt-3" : ""}`}>
                                <DesktopUpper
                                  currentMode="board"
                                  activeTab="normal"
                                  onTabChange={() => {}}
                                  onCreateNew={() => {}}
                                  viewMode={viewMode}
                                  onViewModeChange={setViewMode}
                                  columnCount={columnCount}
                                  onColumnCountChange={setColumnCount}
                                  rightPanelMode="hidden"
                                  customTitle={boardName || "ボード詳細"}
                                  boardDescription={boardDescription}
                                  boardId={boardId}
                                  onBoardExport={handleExport}
                                  onBoardSettings={onSettings || handleSettings}
                                  isExportDisabled={false}
                                  marginBottom="mb-0"
                                  headerMarginBottom="mb-0"
                                  showEditDate={showEditDate}
                                  onShowEditDateChange={setShowEditDate}
                                  showTagDisplay={showTags}
                                  onShowTagDisplayChange={
                                    handleTagDisplayChange
                                  }
                                  boardLayout={boardLayout}
                                  isReversed={isReversed}
                                  onBoardLayoutChange={handleBoardLayoutChange}
                                  showMemo={showMemo}
                                  showTask={showTask}
                                  showComment={showComment}
                                  onMemoToggle={handleMemoToggle}
                                  onTaskToggle={handleTaskToggle}
                                  onCommentToggle={handleCommentToggle}
                                  contentFilterRightPanelMode={rightPanelMode}
                                  normalCount={
                                    allMemoItems.length + allTaskItems.length
                                  }
                                  completedCount={completedCount}
                                  deletedCount={deletedCount + deletedMemoCount}
                                  selectionMode={selectionMode}
                                  onSelectionModeChange={
                                    handleSelectionModeChange
                                  }
                                  onSelectAll={undefined}
                                  isAllSelected={false}
                                  onCsvImport={() =>
                                    setIsCSVImportModalOpen(true)
                                  }
                                  hideControls={false}
                                  floatControls={true}
                                  teamMode={teamMode}
                                />
                              </div>
                            )}

                            <CommentSection
                              title="ボードコメント"
                              placeholder="ボードにコメントを追加..."
                              teamId={teamId || undefined}
                              targetType="board"
                              targetOriginalId={boardId.toString()}
                              teamMembers={teamMembers}
                              boardId={boardId}
                              onItemClick={(itemType, originalId) => {
                                if (itemType === "memo") {
                                  const memo = boardMemos.find(
                                    (m) => m.originalId === originalId,
                                  );
                                  if (memo) {
                                    onSelectMemo?.(memo as Memo);
                                  }
                                } else if (itemType === "task") {
                                  const task = boardTasks.find(
                                    (t) => t.originalId === originalId,
                                  );
                                  if (task) {
                                    onSelectTask?.(task as Task);
                                  }
                                }
                              }}
                            />
                          </ResizablePanel>
                        )}
                      </ResizablePanelGroup>
                    );
                  })()}
            </>
          ) : (
            <>
              {/* 個人モード: 既存の2パネル構造 */}
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
                allTags={safeAllTags}
                allBoards={safeAllBoards}
                allTaggings={(safeAllTaggings || []) as Tagging[]}
                allBoardItems={safeAllBoardItems}
                showEditDate={showEditDate}
                showTags={showTags}
                selectedMemo={selectedMemo}
                boardId={boardId}
                onCreateNewMemo={handleCreateNewMemo}
                onSetRightPanelMode={setRightPanelMode}
                onMemoTabChange={handleMemoTabChangeWithRefresh}
                onSelectMemo={handleSelectMemo}
                memoSelectionMode={selectionMode}
                checkedMemos={checkedMemos}
                onMemoSelectionToggle={handleMemoSelectionToggle}
                onSelectAll={handleMemoSelectAll}
                isAllSelected={isMemoAllSelected}
                onBulkDelete={() => handleBulkDelete("memo")}
                isDeleting={isMemoDeleting}
                isLidOpen={isMemoLidOpen}
                currentDisplayCount={currentMemoDisplayCount}
                deleteButtonRef={deleteButtonRef}
                onCheckedMemosChange={setCheckedMemos}
                onTagging={handleTaggingMemo}
              />

              {/* タスク列 */}
              <BoardTaskSection
                boardId={boardId}
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
                showTags={showTags}
                showBoardName={false}
                allTags={safeAllTags}
                allBoards={safeAllBoards}
                allTaggings={(safeAllTaggings || []) as Tagging[]}
                allBoardItems={safeAllBoardItems}
                selectedTask={selectedTask}
                onCreateNewTask={handleCreateNewTask}
                onSetRightPanelMode={setRightPanelMode}
                onTaskTabChange={handleTaskTabChangeWithRefresh}
                onSelectTask={handleSelectTask}
                taskSelectionMode={selectionMode}
                checkedTasks={checkedTasks}
                onTaskSelectionToggle={handleTaskSelectionToggle}
                onSelectAll={handleTaskSelectAll}
                isAllSelected={isTaskAllSelected}
                onBulkDelete={() => handleBulkDelete("task")}
                isDeleting={isTaskDeleting}
                isLidOpen={isTaskLidOpen}
                currentDisplayCount={currentTaskDisplayCount}
                deleteButtonRef={deleteButtonRef}
                onCheckedTasksChange={setCheckedTasks}
                onTagging={handleTaggingTask}
              />
            </>
          )}
        </div>
      </div>

      {/* 削除モーダル */}
      <BulkDeleteConfirmation
        isOpen={bulkDelete.isModalOpen}
        onClose={() => {
          setDeletingItemType(null);
          if (deletingItemType === "memo") {
            bulkAnimation.handleModalCancel(
              setIsMemoDeleting,
              setIsMemoLidOpen,
            );
          } else if (deletingItemType === "task") {
            bulkAnimation.handleModalCancel(
              setIsTaskDeleting,
              setIsTaskLidOpen,
            );
          }
          bulkDelete.handleCancel();
        }}
        onConfirm={bulkDelete.handleConfirm}
        count={bulkDelete.targetIds.length}
        itemType={deletingItemType || "memo"}
        deleteType={
          deletingItemType === "memo"
            ? activeMemoTab === "deleted"
              ? "permanent"
              : "normal"
            : activeTaskTab === "deleted"
              ? "permanent"
              : "normal"
        }
        isLoading={bulkDelete.isDeleting}
        customMessage={bulkDelete.customMessage}
        customTitle={`${deletingItemType === "memo" ? "メモ" : "タスク"}の操作を選択`}
        showRemoveFromBoard={true}
        onRemoveFromBoard={handleRemoveFromBoard}
        statusBreakdown={getModalStatusBreakdown()}
        hasOtherTabItems={getHasOtherTabItems()}
      />

      {/* 右側：詳細表示（個人モードのみ） */}
      {!teamMode && (
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
          activeMemoTab={activeMemoTab}
          selectedItemsFromList={selectedItemsFromList}
          allMemos={boardMemos}
          allTasks={boardTasks}
          allBoards={allBoards || []}
          allTaggings={(safeAllTaggings || []) as Tagging[]}
          allBoardItems={safeAllBoardItems}
          itemBoards={completeItemBoards}
          onClose={
            rightPanelMode
              ? () => handleCloseRightPanel(onClearSelection)
              : handleCloseDetail
          }
          onSelectMemo={onSelectMemo}
          onSelectTask={onSelectTask}
          onAddSelectedItems={handleAddSelectedItems}
          onToggleItemSelection={handleToggleItemSelection}
          onMemoDeleteAndSelectNext={handleMemoDeleteAndSelectNext}
          onTaskDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
          onDeletedMemoDeleteAndSelectNext={
            handleDeletedMemoDeleteAndSelectNext
          }
          onDeletedTaskDeleteAndSelectNext={
            handleDeletedTaskDeleteAndSelectNext
          }
          onMemoRestoreAndSelectNext={handleMemoRestoreAndSelectNext}
          onTaskRestoreAndSelectNext={handleTaskRestoreAndSelectNext}
          onAddMemoToBoard={handleAddMemoToBoard}
          onAddTaskToBoard={handleAddTaskToBoard}
        />
      )}

      {/* CSVインポートモーダル */}
      <CSVImportModal
        isOpen={isCSVImportModalOpen}
        onClose={() => setIsCSVImportModalOpen(false)}
        boardId={boardId}
      />

      {/* タグ追加モーダル */}
      <TagAddModal
        isOpen={isTagAddModalOpen}
        onClose={() => setIsTagAddModalOpen(false)}
        tags={safeAllTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        }))}
        selectedItemCount={
          tagSelectionMenuType === "memo"
            ? checkedMemos.size
            : checkedTasks.size
        }
        itemType={tagSelectionMenuType}
        selectedItems={
          tagSelectionMenuType === "memo"
            ? Array.from(checkedMemos)
                .filter((id) => id != null)
                .map((id) => id.toString())
            : Array.from(checkedTasks)
                .filter((id) => id != null)
                .map((id) => id.toString())
        }
        allItems={tagSelectionMenuType === "memo" ? allMemoItems : allTaskItems}
        onSuccess={() => {
          if (tagSelectionMenuType === "memo") {
            setCheckedMemos(new Set());
          } else {
            setCheckedTasks(new Set());
          }
        }}
      />
    </div>
  );
}

export default memo(BoardDetailScreen);
