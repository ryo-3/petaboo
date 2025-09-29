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
import { useDeletedMemos, useDeleteMemo } from "@/src/hooks/use-memos";
import { useBoards, useAddItemToBoard } from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";
import type { Tagging } from "@/src/types/tag";
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
  teamMode?: boolean;
  teamId?: number | null;
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
  teamMode = false,
  teamId = null,
}: BoardDetailProps) {
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

  // 削除と次選択を組み合わせたハンドラー
  const handleMemoDeleteWithNextSelection = useCallback(
    async (memoToDelete: Memo) => {
      try {
        console.log("🗑️ メモ削除処理開始", {
          memoId: memoToDelete.id,
          teamMode,
          teamId,
        });

        // 実際の削除API呼び出し
        await deleteMemoMutation.mutateAsync(memoToDelete.id);

        console.log("✅ メモ削除完了、次選択処理実行");

        // 削除完了後に次選択ロジックを実行
        handleMemoDeleteAndSelectNext(memoToDelete);
      } catch (error) {
        console.error("❌ メモ削除エラー", error);
      }
    },
    [deleteMemoMutation, handleMemoDeleteAndSelectNext, teamMode, teamId],
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
  const { data: personalTaggings } = useAllTaggings();
  const { data: teamTaggings } = useAllTeamTaggings(teamId || 0);
  const { data: allBoardItems } = useAllBoardItems();
  const { data: personalTags } = useTags();
  const { data: teamTags } = useTeamTags(teamId || 0);
  const { data: personalBoards } = useBoards("normal", !teamMode);
  const { data: teamBoards } = useTeamBoards(teamId, "normal");

  // チームモードかどうかでタグ付けデータを切り替え
  const allTaggings = teamMode && teamId ? teamTaggings : personalTaggings;

  // チームモードかどうかでタグを切り替え
  const allTags = teamMode && teamId ? teamTags : personalTags;

  // チームモードかどうかでボード一覧を切り替え
  const allBoards = teamMode ? teamBoards : personalBoards;
  const { categories } = useBoardCategories();

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
    <div className="flex h-full bg-white overflow-hidden">
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
        } pt-3 pl-5 pr-4 ${!teamMode && (selectedMemo || selectedTask || rightPanelMode) ? "pr-2" : "pr-4"} flex flex-col transition-all duration-300 relative`}
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
            showMemo={
              !teamMode && rightPanelMode === "task-list" ? false : showMemo
            }
            showTask={
              !teamMode && rightPanelMode === "memo-list" ? false : showTask
            }
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

        {/* メモ・タスクコンテンツ - チームモードでは動的3パネル構成 */}
        <div
          className={`${
            teamMode
              ? selectedMemo || selectedTask
                ? "grid grid-cols-[25%_50%_25%] gap-2 flex-1 min-h-0"
                : "grid grid-cols-3 gap-2 flex-1 min-h-0"
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
              {/* 左パネル: 選択に応じてメモ一覧またはタスク一覧 */}
              <div className="rounded-lg bg-white flex flex-col min-h-0">
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
                    allTaggings={(safeAllTaggings || []) as Tagging[]}
                    teamMode={teamMode}
                    teamId={teamId}
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
                    allTaggings={(safeAllTaggings || []) as Tagging[]}
                    allBoardItems={safeAllBoardItems}
                    showEditDate={showEditDate}
                    showTags={showTags}
                    selectedMemo={selectedMemo}
                    teamMode={teamMode}
                    teamId={teamId}
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
                )}
              </div>

              {/* 中央パネル: 詳細表示またはタスク一覧 */}
              <div className="rounded-lg bg-white flex flex-col min-h-0">
                {selectedMemo ? (
                  /* メモ選択時: メモ詳細を表示 */
                  <div className="h-full flex flex-col">
                    <div className="pl-2 pr-2 flex items-center gap-3">
                      <PanelBackButton onClick={onClearSelection} />
                      <h3 className="text-sm font-medium text-gray-700">
                        メモ詳細
                      </h3>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto hover-scrollbar">
                      <MemoEditor
                        memo={selectedMemo as Memo}
                        initialBoardId={boardId}
                        onClose={onClearSelection || (() => {})}
                        customHeight="h-full"
                        teamMode={teamMode}
                        teamId={teamId || undefined}
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
                        onDelete={() => {
                          console.log("🚀 onDelete呼び出し", { selectedMemo });
                          if (selectedMemo && "id" in selectedMemo) {
                            handleMemoDeleteWithNextSelection(
                              selectedMemo as Memo,
                            );
                          } else {
                            console.error(
                              "❌ selectedMemoがnullまたは削除済みメモ",
                            );
                          }
                        }}
                        onDeleteAndSelectNext={(memo) => {
                          if ("id" in memo) {
                            handleMemoDeleteWithNextSelection(memo as Memo);
                          } else {
                            console.error("❌ 削除対象メモが不正", memo);
                          }
                        }}
                        onRestore={() => {
                          console.log(
                            "🔄 チームボード詳細 - 復元ボタンクリック",
                            {
                              selectedMemo,
                              hasOriginalId:
                                selectedMemo && "originalId" in selectedMemo,
                              originalId:
                                selectedMemo && "originalId" in selectedMemo
                                  ? (selectedMemo as DeletedMemo).originalId
                                  : null,
                            },
                          );
                          if (selectedMemo && "originalId" in selectedMemo) {
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
                        onRestoreAndSelectNext={handleMemoRestoreAndSelectNext}
                        totalDeletedCount={deletedMemos?.length || 0}
                      />
                    </div>
                  </div>
                ) : selectedTask ? (
                  /* タスク選択時: タスク詳細を表示 */
                  <div className="h-full flex flex-col">
                    <div className="pl-2 pr-2 flex items-center gap-3">
                      <PanelBackButton onClick={onClearSelection} />
                      <h3 className="text-sm font-medium text-gray-700">
                        タスク詳細
                      </h3>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto hover-scrollbar">
                      <TaskEditor
                        task={selectedTask as Task}
                        initialBoardId={boardId}
                        onClose={onClearSelection || (() => {})}
                        customHeight="h-full"
                        teamMode={teamMode}
                        teamId={teamId || undefined}
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
                      />
                    </div>
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
                    teamMode={teamMode}
                    teamId={teamId}
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
              </div>

              {/* 右パネル: コンテキストに応じたコメント */}
              <div className="rounded-lg bg-white pr-2">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {selectedMemo
                      ? `メモコメント`
                      : selectedTask
                        ? `タスクコメント`
                        : `ボードコメント`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedMemo
                      ? `メモID: ${selectedMemo.id}`
                      : selectedTask
                        ? `タスクID: ${selectedTask.id}`
                        : `ボードID: ${boardId}`}
                  </p>
                </div>
              </div>
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
                teamMode={teamMode}
                teamId={teamId}
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
                teamMode={teamMode}
                teamId={teamId}
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
          teamMode={teamMode}
          teamId={teamId}
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
