import BoardMemoSection from "@/components/features/board/board-memo-section";
import BoardRightPanel from "@/components/features/board/board-right-panel";
import BoardTaskSection from "@/components/features/board/board-task-section";
import { ControlPanelLayout } from "@/components/layout/control-panel-layout";
import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import { PanelBackButton } from "@/components/ui/buttons/panel-back-button";
import { getContinuousCreateMode } from "@/components/ui/buttons/continuous-create-button";
import { useBoardState } from "@/src/hooks/use-board-state";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import { useTeamContext } from "@/src/contexts/team-context";
import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";
import { useTeamDetailSafe } from "@/src/contexts/team-detail-context";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
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
import type { HeaderControlPanelConfig } from "@/src/contexts/header-control-panel-context";
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
import { useAllAttachments } from "@/src/hooks/use-all-attachments";
import MobileFabButton from "@/components/ui/buttons/mobile-fab-button";
import { useUserInfo } from "@/src/hooks/use-user-info";
import { getUserAvatarColor } from "@/src/utils/userUtils";
import {
  calculatePanelOrders,
  countVisiblePanels,
  calculatePanelSizes,
  getPanelCombinationKey,
} from "@/src/utils/panel-helpers";
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
}: BoardDetailProps) {
  const { isTeamMode: teamMode, teamId, teamSlug } = useTeamContext();
  const { setConfig } = useHeaderControlPanel();
  const teamDetailContext = useTeamDetailSafe();

  // チームメンバーを取得（メンション機能用）
  const { data: teamDetail } = useTeamDetail(teamSlug || "");
  const teamMembers = teamDetail?.members || [];

  // ViewSettingsContextから取得
  const { settings, sessionState, updateSettings, updateSessionState } =
    useViewSettings();

  // CSVインポートモーダル状態
  const [isCSVImportModalOpen, setIsCSVImportModalOpen] = useState(false);
  const handleCsvImport = useCallback(() => {
    setIsCSVImportModalOpen(true);
  }, []);

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
    boardLayout,
    isReversed,
    showMemo,
    showTask,
    showComment,
    showListPanel,
    showDetailPanel,
    showCommentPanel,
    setRightPanelMode,
    setShowMemo,
    setShowTask,
    setShowComment,
    handleBoardLayoutChange,
    handleSettings,
    handleMemoToggle,
    handleTaskToggle,
    handleCommentToggle,
    handleListPanelToggle,
    handleDetailPanelToggle,
    handleCommentPanelToggle,
    handleTaskTabChange,
    handleMemoTabChange,
    handleToggleItemSelection,
    handleCloseRightPanel,
    createNewMemoHandler,
    createNewTaskHandler,
    setShowTabText,
    setShowListPanel,
    setShowDetailPanel,
    setShowCommentPanel,
  } = useBoardState();

  // ViewSettingsContextから取得した値を使用
  const columnCount = settings.boardColumnCount;
  const setColumnCount = (count: number) =>
    updateSettings({ boardColumnCount: count });
  const selectedTagIds = sessionState.selectedTagIds;
  const setSelectedTagIds = (ids: number[]) =>
    updateSessionState({ selectedTagIds: ids });
  const tagFilterMode = sessionState.tagFilterMode;
  const setTagFilterMode = (mode: "include" | "exclude") =>
    updateSessionState({ tagFilterMode: mode });
  const showTagDisplay = settings.showTagDisplay;
  const setShowTagDisplay = (show: boolean) =>
    updateSettings({ showTagDisplay: show });

  // デスクトップ判定（md: 768px以上）
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // タグ表示管理

  // propsから選択状態を使用（Fast Refresh対応）
  const selectedMemo = propSelectedMemo;
  const selectedTask = propSelectedTask;

  // モバイル時: メモ/タスクが選択されたらエディターパネルを全画面表示
  useEffect(() => {
    if (!isDesktop && (selectedMemo || selectedTask)) {
      setShowListPanel(false);
      setShowDetailPanel(true);
      setShowCommentPanel(false);
    } else if (!isDesktop && !selectedMemo && !selectedTask) {
      setShowListPanel(true);
      setShowDetailPanel(false);
      setShowCommentPanel(false);
    }
  }, [
    isDesktop,
    selectedMemo,
    selectedTask,
    setShowListPanel,
    setShowDetailPanel,
    setShowCommentPanel,
  ]);

  // チームモード時: selectedMemo/selectedTaskの状態をContextに反映（フッター切り替え用）
  useEffect(() => {
    if (teamMode && teamDetailContext) {
      if (selectedMemo) {
        teamDetailContext.setSelectedMemoId(selectedMemo.id);
        teamDetailContext.setIsCreatingMemo(selectedMemo.id === 0);
      } else {
        teamDetailContext.setSelectedMemoId(null);
        teamDetailContext.setIsCreatingMemo(false);
      }

      if (selectedTask) {
        teamDetailContext.setSelectedTaskId(selectedTask.id);
        teamDetailContext.setIsCreatingTask(selectedTask.id === 0);
      } else {
        teamDetailContext.setSelectedTaskId(null);
        teamDetailContext.setIsCreatingTask(false);
      }
    }
  }, [teamMode, teamDetailContext, selectedMemo, selectedTask]);

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

  // ボード操作フック（一括削除の前に呼び出してboardMemos/boardTasksを取得）
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

  // 一括削除操作フック（boardMemos/boardTasksを使うので後に呼び出す）
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
    boardMemos,
    boardTasks,
    boardDeletedItems,
  });

  // タブテキスト表示制御
  // モバイルフッターからのセクション切り替えイベントをリッスン
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent) => {
      const { section } = event.detail;

      // スマホ表示では、押したセクションのみを表示し、他は非表示にする
      if (section === "memos") {
        // メモのみ表示
        setShowMemo(true);
        setShowTask(false);
        setShowComment(false);
      } else if (section === "tasks") {
        // タスクのみ表示
        setShowMemo(false);
        setShowTask(true);
        setShowComment(false);
      } else if (section === "comments") {
        // コメントのみ表示
        setShowMemo(false);
        setShowTask(false);
        setShowComment(true);
      }
    };

    window.addEventListener(
      "board-section-change",
      handleSectionChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "board-section-change",
        handleSectionChange as EventListener,
      );
    };
  }, [setShowMemo, setShowTask, setShowComment]);

  // FABボタンからの新規作成イベントをリッスン
  useEffect(() => {
    const handleMemoCreate = () => {
      // モバイル時は即座にエディターパネルに切り替え（ちらつき防止）
      if (!isDesktop) {
        setShowListPanel(false);
        setShowDetailPanel(true);
        setShowCommentPanel(false);
      }
      handleCreateNewMemo();
    };

    const handleTaskCreate = () => {
      // モバイル時は即座にエディターパネルに切り替え（ちらつき防止）
      if (!isDesktop) {
        setShowListPanel(false);
        setShowDetailPanel(true);
        setShowCommentPanel(false);
      }
      handleCreateNewTask();
    };

    window.addEventListener("team-memo-create", handleMemoCreate);
    window.addEventListener("team-task-create", handleTaskCreate);

    return () => {
      window.removeEventListener("team-memo-create", handleMemoCreate);
      window.removeEventListener("team-task-create", handleTaskCreate);
    };
  }, [
    handleCreateNewMemo,
    handleCreateNewTask,
    isDesktop,
    setShowListPanel,
    setShowDetailPanel,
    setShowCommentPanel,
  ]);

  // ボード詳細内でのメモ/タスクエディターの戻るボタンイベントをリッスン
  useEffect(() => {
    const handleMemoBack = () => {
      if (onSelectMemo) {
        onSelectMemo(null);
      }
    };

    const handleTaskBack = () => {
      if (onSelectTask) {
        onSelectTask(null);
      }
    };

    window.addEventListener("board-memo-back", handleMemoBack);
    window.addEventListener("board-task-back", handleTaskBack);

    return () => {
      window.removeEventListener("board-memo-back", handleMemoBack);
      window.removeEventListener("board-task-back", handleTaskBack);
    };
  }, [onSelectMemo, onSelectTask]);

  // 状態変更時にレイアウトに通知（フッターボタンのアクティブ状態を更新）
  useEffect(() => {
    let activeSection: "memos" | "tasks" | "comments" = "memos";
    if (showMemo && !showTask && !showComment) {
      activeSection = "memos";
    } else if (!showMemo && showTask && !showComment) {
      activeSection = "tasks";
    } else if (!showMemo && !showTask && showComment) {
      activeSection = "comments";
    }

    window.dispatchEvent(
      new CustomEvent("board-section-state-change", {
        detail: { activeSection },
      }),
    );
  }, [showMemo, showTask, showComment]);

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

  // 計算されたカラム数（エディター表示時にメモ・タスク両方表示なら1列、その他は最大2列に制限）
  const effectiveColumnCount =
    (selectedMemo || selectedTask) && showMemo && showTask
      ? 1
      : selectedMemo || selectedTask || rightPanelMode
        ? columnCount <= 2
          ? columnCount
          : 2
        : columnCount;

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
  const { data: allMemoAttachments } = useAllAttachments(
    teamMode ? teamId || undefined : undefined,
    "memo",
    true,
  );
  const { data: allTaskAttachments } = useAllAttachments(
    teamMode ? teamId || undefined : undefined,
    "task",
    true,
  );

  // メモとタスクの添付ファイルを統合
  const allAttachments = useMemo(
    () => [...(allMemoAttachments || []), ...(allTaskAttachments || [])],
    [allMemoAttachments, allTaskAttachments],
  );

  // チームモードかどうかでタグ付けデータを切り替え
  const allTaggings = teamMode && teamId ? teamTaggings : personalTaggings;

  // チームモードかどうかでタグを切り替え
  const allTags = teamMode && teamId ? teamTags : personalTags;

  // チームモードかどうかでボード一覧を切り替え
  const allBoards = teamMode ? teamBoards : personalBoards;
  const { categories } = useBoardCategories();

  const headerShowMemo = rightPanelMode === "task-list" ? false : showMemo;
  const headerShowTask = rightPanelMode === "memo-list" ? false : showTask;
  const boardSettingsHandler = onSettings || handleSettings;
  const headerRightPanelMode = (
    selectedMemo || selectedTask || rightPanelMode ? "view" : "hidden"
  ) as "hidden" | "view" | "create";
  const totalNormalCount = allMemoItems.length + allTaskItems.length;
  const totalDeletedCount = deletedCount + deletedMemoCount;
  const shouldShowPanelControls =
    teamMode && !rightPanelMode && (selectedMemo || selectedTask);
  const selectedItemType = selectedMemo ? "memo" : selectedTask ? "task" : null;

  const boardHeaderConfig = useMemo<HeaderControlPanelConfig | null>(() => {
    const config: HeaderControlPanelConfig = {
      currentMode: "board",
      rightPanelMode: headerRightPanelMode,
      boardId,
      onBoardSettings: boardSettingsHandler,
      onBoardExport: handleExport,
      isExportDisabled: false,
      boardLayout,
      isReversed,
      onBoardLayoutChange: handleBoardLayoutChange,
      normalCount: totalNormalCount,
      completedCount,
      deletedCount: totalDeletedCount,
      onCsvImport: handleCsvImport,
      customTitle: boardName || "ボード詳細",
      teamMode,
      teamId: teamId ?? undefined,
      selectionMode,
      onSelectionModeChange: handleSelectionModeChange,
    };

    if (shouldShowPanelControls) {
      config.isSelectedMode = true;
      config.showMemo = showListPanel;
      config.showTask = showDetailPanel;
      config.showComment = showCommentPanel;
      config.onMemoToggle = handleListPanelToggle;
      config.onTaskToggle = handleDetailPanelToggle;
      config.onCommentToggle = handleCommentPanelToggle;
      config.contentFilterRightPanelMode = rightPanelMode;
      config.listTooltip = showListPanel
        ? "一覧パネルを非表示"
        : "一覧パネルを表示";
      config.detailTooltip = showDetailPanel
        ? "詳細パネルを非表示"
        : "詳細パネルを表示";
      config.selectedItemType = selectedItemType;
    } else {
      config.showMemo = headerShowMemo;
      config.showTask = headerShowTask;
      config.onMemoToggle = handleMemoToggle;
      config.onTaskToggle = handleTaskToggle;
      config.contentFilterRightPanelMode = rightPanelMode;
      if (teamMode) {
        config.showComment = showComment;
        config.onCommentToggle = handleCommentToggle;
      }
    }

    return config;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    headerRightPanelMode,
    boardId,
    // boardSettingsHandler, // 関数は除外
    // handleExport, // 関数は除外
    boardLayout,
    isReversed,
    // handleBoardLayoutChange, // 関数は除外
    totalNormalCount,
    completedCount,
    totalDeletedCount,
    // handleCsvImport, // 関数は除外
    boardName,
    teamMode,
    teamId,
    selectionMode,
    // handleSelectionModeChange, // 関数は除外
    shouldShowPanelControls,
    showListPanel,
    showDetailPanel,
    showCommentPanel,
    // handleListPanelToggle, // 関数は除外
    // handleDetailPanelToggle, // 関数は除外
    // handleCommentPanelToggle, // 関数は除外
    rightPanelMode,
    selectedItemType,
    headerShowMemo,
    headerShowTask,
    // handleMemoToggle, // 関数は除外
    // handleTaskToggle, // 関数は除外
    showComment,
    // handleCommentToggle, // 関数は除外
  ]);

  const boardHeaderOwnerRef = useRef<symbol | null>(null);

  useEffect(() => {
    if (!boardHeaderConfig) {
      if (boardHeaderOwnerRef.current) {
        setConfig(null);
        boardHeaderOwnerRef.current = null;
      }
      return;
    }

    const owner = Symbol("header-control-panel");
    boardHeaderOwnerRef.current = owner;
    setConfig(boardHeaderConfig);

    return () => {
      if (boardHeaderOwnerRef.current === owner) {
        setConfig(null);
        boardHeaderOwnerRef.current = null;
      }
    };
  }, [boardHeaderConfig]);

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

  // パネル幅管理（ControlPanelLayoutと同じロジック）
  const resizeTimerSelected = useRef<NodeJS.Timeout | null>(null);
  const resizeTimerUnselected = useRef<NodeJS.Timeout | null>(null);
  const mountCountSelected = useRef(0);
  const mountCountUnselected = useRef(0);

  // パネル幅保存の型定義
  type PanelSizesMap = {
    [key: string]: { left: number; center: number; right: number };
  };

  // 選択時のパネル幅を取得（localStorageから復元、組み合わせごとに保存）
  const [panelSizesSelectedMap, setPanelSizesSelectedMap] =
    useState<PanelSizesMap>(() => {
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
      return {
        "3panel": { left: 25, center: 45, right: 30 },
        "left-center": { left: 30, center: 70, right: 0 },
        "left-right": { left: 30, center: 0, right: 70 },
        "center-right": { left: 0, center: 40, right: 60 },
      };
    });

  // 非選択時のパネル幅を取得（localStorageから復元、組み合わせごとに保存）
  const [panelSizesUnselectedMap, setPanelSizesUnselectedMap] =
    useState<PanelSizesMap>(() => {
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
      return {
        "3panel": { left: 33, center: 34, right: 33 },
        "left-center": { left: 50, center: 50, right: 0 },
        "left-right": { left: 40, center: 0, right: 60 },
        "center-right": { left: 0, center: 50, right: 50 },
      };
    });

  // 選択状態が変わったらマウントカウントをリセット
  useEffect(() => {
    mountCountSelected.current = 0;
  }, [selectedMemo?.originalId, selectedTask?.originalId]);

  useEffect(() => {
    if (!selectedMemo && !selectedTask) {
      mountCountUnselected.current = 0;
    }
  }, [selectedMemo, selectedTask]);

  // 選択時のパネルリサイズハンドラー
  const handlePanelResizeSelected = useCallback(
    (sizes: number[]) => {
      mountCountSelected.current++;
      if (mountCountSelected.current <= 1) {
        return; // 初回マウント時はスキップ
      }

      // 2パネル以上の場合に保存（1パネルは常に100%なので保存不要）
      if (sizes.length >= 2) {
        // 現在のパネル表示状態からキーとorderを取得
        const visibility = {
          left: showListPanel,
          center: showDetailPanel,
          right: showCommentPanel,
        };
        const combinationKey = getPanelCombinationKey(visibility);
        const orders = calculatePanelOrders(visibility);

        // sizesはorderの順番で入っているので、正しく対応させる
        const newSizes = {
          left: orders.left > 0 ? (sizes[orders.left - 1] ?? 0) : 0,
          center: orders.center > 0 ? (sizes[orders.center - 1] ?? 0) : 0,
          right: orders.right > 0 ? (sizes[orders.right - 1] ?? 0) : 0,
        };

        if (resizeTimerSelected.current) {
          clearTimeout(resizeTimerSelected.current);
        }

        resizeTimerSelected.current = setTimeout(() => {
          setPanelSizesSelectedMap((prev) => {
            const updated = { ...prev, [combinationKey]: newSizes };
            localStorage.setItem(
              "team-board-panel-sizes-selected",
              JSON.stringify(updated),
            );
            return updated;
          });
        }, 500);
      }
    },
    [showListPanel, showDetailPanel, showCommentPanel],
  );

  // 非選択時のパネルリサイズハンドラー
  const handlePanelResizeUnselected = useCallback(
    (sizes: number[]) => {
      mountCountUnselected.current++;
      if (mountCountUnselected.current <= 1) {
        return; // 初回マウント時はスキップ
      }

      // 2パネル以上の場合に保存（1パネルは常に100%なので保存不要）
      if (sizes.length >= 2) {
        // 現在のパネル表示状態からキーとorderを取得
        const visibility = {
          left: showMemo,
          center: showTask,
          right: showComment,
        };
        const combinationKey = getPanelCombinationKey(visibility);
        const orders = calculatePanelOrders(visibility);

        // sizesはorderの順番で入っているので、正しく対応させる
        const newSizes = {
          left: orders.left > 0 ? (sizes[orders.left - 1] ?? 0) : 0,
          center: orders.center > 0 ? (sizes[orders.center - 1] ?? 0) : 0,
          right: orders.right > 0 ? (sizes[orders.right - 1] ?? 0) : 0,
        };

        if (resizeTimerUnselected.current) {
          clearTimeout(resizeTimerUnselected.current);
        }

        resizeTimerUnselected.current = setTimeout(() => {
          setPanelSizesUnselectedMap((prev) => {
            const updated = { ...prev, [combinationKey]: newSizes };
            localStorage.setItem(
              "team-board-panel-sizes-unselected",
              JSON.stringify(updated),
            );
            return updated;
          });
        }, 500);
      }
    },
    [showMemo, showTask, showComment],
  );

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
            onBoardSettings={onSettings}
          />
        )}
        <div className="text-center py-8">
          <p className="text-red-500">アイテムの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  // 本番デバッグ用
  useEffect(() => {
    const centerPanel = document.querySelector(
      '[data-panel-id="board-center-panel"]',
    );
    if (centerPanel) {
      const computedStyle = window.getComputedStyle(centerPanel);
      const actualPaddingLeft = computedStyle.paddingLeft;

      console.log("🎯 [Board Padding Debug - Actual DOM]", {
        teamMode,
        selectedMemo: !!selectedMemo,
        selectedTask: !!selectedTask,
        showCommentPanel,
        showComment,
        showMemo,
        showTask,
        shouldRemovePadding:
          (teamMode && (selectedMemo || selectedTask)) ||
          showCommentPanel ||
          (showComment && !showMemo && !showTask),
        "📏 実際のpaddingLeft": actualPaddingLeft,
        "✅ pl-4が適用されているか": actualPaddingLeft === "16px",
        className: centerPanel.className,
      });
    }
  }, [
    teamMode,
    selectedMemo,
    selectedTask,
    showCommentPanel,
    showComment,
    showMemo,
    showTask,
  ]);

  return (
    <div className="flex h-full bg-white overflow-x-auto overflow-y-hidden">
      {/* 左側：メモ・タスク一覧 */}
      <div
        data-panel-id="board-center-panel"
        className={`${
          teamMode
            ? rightPanelMode
              ? "w-[44%] border-r border-gray-300" // チームモード：メモ/タスク一覧表示時は2パネル
              : "w-full" // チームモード：通常時は3パネルレイアウトで制御
            : selectedMemo || selectedTask || rightPanelMode
              ? rightPanelMode
                ? "w-[44%] border-r border-gray-300" // 個人モード：リスト表示時
                : "w-[44%] border-r border-gray-300" // 個人モード：エディター表示時
              : "w-full"
        } pl-4 flex flex-col ${teamMode ? "" : "transition-all duration-300"} relative`}
        style={{
          paddingLeft:
            (teamMode && (selectedMemo || selectedTask)) ||
            showCommentPanel ||
            (showComment && !showMemo && !showTask)
              ? "0"
              : undefined,
        }}
      >
        {/* メモ・タスクコンテンツ - チームモードでは動的3パネル構成 */}
        <div
          className={`${
            teamMode && !rightPanelMode
              ? "flex gap-2 flex-1 min-h-0"
              : teamMode && rightPanelMode
                ? "flex flex-col gap-2 flex-1 min-h-0"
                : !teamMode &&
                    (rightPanelMode === "memo-list" ||
                      rightPanelMode === "task-list")
                  ? "flex flex-col"
                  : !showMemo || !showTask || boardLayout === "vertical"
                    ? isReversed
                      ? "flex flex-col-reverse"
                      : "flex flex-col"
                    : `grid grid-cols-1 lg:grid-cols-2${isReversed ? " [&>*:nth-child(1)]:order-2 [&>*:nth-child(2)]:order-1" : ""}`
          }`}
        >
          {teamMode && !rightPanelMode ? (
            <>
              {selectedMemo || selectedTask
                ? /* 選択時: 動的パネル構成 */
                  (() => {
                    // 選択時: 一覧・詳細・コメントの3パネル構成（各パネル個別にトグル可能）
                    const visibility = {
                      left: showListPanel,
                      center: showDetailPanel,
                      right: showCommentPanel,
                    };
                    const visiblePanels = countVisiblePanels(visibility);
                    const orders = calculatePanelOrders(visibility);
                    const {
                      left: listOrder,
                      center: detailOrder,
                      right: commentOrder,
                    } = orders;

                    // パネルサイズの計算（localStorageから復元、または固定値）
                    const combinationKey = getPanelCombinationKey(visibility);
                    const savedSizes = panelSizesSelectedMap[combinationKey] ||
                      panelSizesSelectedMap["3panel"] || {
                        left: 25,
                        center: 45,
                        right: 30,
                      };
                    const calculatedSizes = calculatePanelSizes(
                      visiblePanels,
                      savedSizes,
                      orders,
                    );
                    const sizes = {
                      list: calculatedSizes.left,
                      detail: calculatedSizes.center,
                      comment: calculatedSizes.right,
                    };

                    // スマホ時: 1パネルずつ排他的に表示
                    if (!isDesktop) {
                      return (
                        <div className="flex flex-col flex-1 min-h-0">
                          {/* 一覧パネル表示時 */}
                          {showListPanel &&
                            !showDetailPanel &&
                            !showCommentPanel && (
                              <div className="flex flex-col h-full">
                                {selectedMemo ? (
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
                                    allTags={safeAllTags}
                                    allBoards={safeAllBoards}
                                    allTaggings={
                                      (safeAllTaggings || []) as Tagging[]
                                    }
                                    allBoardItems={safeAllBoardItems}
                                    allAttachments={allAttachments || []}
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
                                ) : (
                                  <BoardTaskSection
                                    boardId={boardId}
                                    rightPanelMode={rightPanelMode}
                                    showMemo={showMemo}
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
                                    showBoardName={false}
                                    allTags={safeAllTags}
                                    allBoards={safeAllBoards}
                                    allTaggings={
                                      (safeAllTaggings || []) as Tagging[]
                                    }
                                    allBoardItems={safeAllBoardItems}
                                    allAttachments={allAttachments || []}
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
                                )}
                              </div>
                            )}
                          {/* 詳細パネル表示時 */}
                          {showDetailPanel &&
                            !showListPanel &&
                            !showCommentPanel && (
                              <div className="flex flex-col h-full pb-2">
                                {selectedMemo ? (
                                  <MemoEditor
                                    memo={selectedMemo as Memo}
                                    initialBoardId={boardId}
                                    onClose={onClearSelection || (() => {})}
                                    customHeight="flex-1 min-h-0"
                                    showDateAtBottom={true}
                                    insideBoardDetail={true}
                                    isInLeftPanel={!showListPanel}
                                    createdBy={
                                      selectedMemo &&
                                      "createdBy" in selectedMemo
                                        ? selectedMemo.createdBy
                                        : null
                                    }
                                    createdByAvatarColor={
                                      selectedMemo &&
                                      "avatarColor" in selectedMemo
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
                                      _wasEmpty: boolean,
                                      isNewMemo: boolean,
                                    ) => {
                                      if (isNewMemo) {
                                        onSelectMemo?.(savedMemo);
                                      }
                                    }}
                                    onDeleteAndSelectNext={(memo) => {
                                      if ("id" in memo) {
                                        handleMemoDeleteWithNextSelection(
                                          memo as Memo,
                                        );
                                      }
                                    }}
                                    onRestore={() => {
                                      if (
                                        selectedMemo &&
                                        "originalId" in selectedMemo
                                      ) {
                                        handleMemoRestoreAndSelectNext(
                                          selectedMemo as DeletedMemo,
                                        );
                                      }
                                    }}
                                    onRestoreAndSelectNext={
                                      handleMemoRestoreAndSelectNext
                                    }
                                    totalDeletedCount={
                                      deletedMemos?.length || 0
                                    }
                                  />
                                ) : selectedTask ? (
                                  <TaskEditor
                                    task={selectedTask as Task}
                                    initialBoardId={boardId}
                                    onClose={onClearSelection || (() => {})}
                                    customHeight="flex-1 min-h-0"
                                    showDateAtBottom={true}
                                    isInLeftPanel={!showListPanel}
                                    createdBy={
                                      selectedTask &&
                                      "createdBy" in selectedTask
                                        ? selectedTask.createdBy
                                        : null
                                    }
                                    createdByAvatarColor={
                                      selectedTask &&
                                      "avatarColor" in selectedTask
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
                                      if (isNewTask && !isContinuousMode) {
                                        onSelectTask?.(savedTask);
                                      }
                                    }}
                                    onDeleteAndSelectNext={(task) => {
                                      if ("id" in task) {
                                        handleTaskDeleteWithNextSelection(
                                          task as Task,
                                        );
                                      }
                                    }}
                                    onRestore={() => {
                                      if (
                                        selectedTask &&
                                        "originalId" in selectedTask
                                      ) {
                                        handleTaskRestoreAndSelectNext(
                                          selectedTask as DeletedTask,
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
                                ) : null}
                              </div>
                            )}
                          {/* コメントパネル表示時 */}
                          {showCommentPanel &&
                            !showListPanel &&
                            !showDetailPanel && (
                              <div className="flex flex-col h-full">
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
                              </div>
                            )}
                        </div>
                      );
                    }

                    // デスクトップ時: ResizablePanelGroupで3パネル表示
                    return (
                      <ResizablePanelGroup
                        key={`selected-${visiblePanels}panel-${listOrder}-${detailOrder}-${commentOrder}`}
                        direction="horizontal"
                        className="flex-1"
                        onLayout={handlePanelResizeSelected}
                      >
                        {/* 左パネル: 一覧（showListPanelで制御） */}
                        {showListPanel && (
                          <>
                            <ResizablePanel
                              id="selected-list"
                              order={listOrder}
                              defaultSize={sizes.list}
                              minSize={25}
                              maxSize={50}
                              className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                            >
                              <div className="flex flex-col h-full relative">
                                {selectedTask ? (
                                  /* タスク選択時: タスク一覧を表示 */
                                  <BoardTaskSection
                                    boardId={boardId}
                                    rightPanelMode={rightPanelMode}
                                    showMemo={showMemo}
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
                                    showBoardName={false}
                                    allTags={safeAllTags}
                                    allBoards={safeAllBoards}
                                    allTaggings={
                                      (safeAllTaggings || []) as Tagging[]
                                    }
                                    allBoardItems={safeAllBoardItems}
                                    allAttachments={allAttachments || []}
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
                                    allTags={safeAllTags}
                                    allBoards={safeAllBoards}
                                    allTaggings={
                                      (safeAllTaggings || []) as Tagging[]
                                    }
                                    allBoardItems={safeAllBoardItems}
                                    allAttachments={allAttachments || []}
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

                        {/* 中央パネル: 詳細表示（showDetailPanelで制御） */}
                        {showDetailPanel && (
                          <>
                            <ResizablePanel
                              id="selected-detail"
                              order={detailOrder}
                              defaultSize={sizes.detail}
                              minSize={35}
                              className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                            >
                              <div className="h-full flex flex-col min-h-0">
                                {!showListPanel && <div></div>}

                                {selectedMemo ? (
                                  /* メモ選択時: メモ詳細を表示 */
                                  <div className="h-full flex flex-col min-h-0">
                                    <MemoEditor
                                      memo={selectedMemo as Memo}
                                      initialBoardId={boardId}
                                      onClose={onClearSelection || (() => {})}
                                      customHeight="flex-1 min-h-0"
                                      showDateAtBottom={true}
                                      insideBoardDetail={true}
                                      isInLeftPanel={!showListPanel}
                                      createdBy={
                                        selectedMemo &&
                                        "createdBy" in selectedMemo
                                          ? selectedMemo.createdBy
                                          : null
                                      }
                                      createdByAvatarColor={
                                        selectedMemo &&
                                        "avatarColor" in selectedMemo
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
                                        }
                                      }}
                                      onRestore={() => {
                                        if (
                                          selectedMemo &&
                                          "originalId" in selectedMemo
                                        ) {
                                          handleMemoRestoreAndSelectNext(
                                            selectedMemo as DeletedMemo,
                                          );
                                        } else {
                                        }
                                      }}
                                      onRestoreAndSelectNext={
                                        handleMemoRestoreAndSelectNext
                                      }
                                      totalDeletedCount={
                                        deletedMemos?.length || 0
                                      }
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
                                      isInLeftPanel={!showListPanel}
                                      createdBy={
                                        selectedTask &&
                                        "createdBy" in selectedTask
                                          ? selectedTask.createdBy
                                          : null
                                      }
                                      createdByAvatarColor={
                                        selectedTask &&
                                        "avatarColor" in selectedTask
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
                                        }
                                      }}
                                      onRestore={() => {
                                        if (
                                          selectedTask &&
                                          "originalId" in selectedTask
                                        ) {
                                          handleTaskRestoreAndSelectNext(
                                            selectedTask as DeletedTask,
                                          );
                                        } else {
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
                                    showMemo={showMemo}
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
                                    showBoardName={false}
                                    allTags={safeAllTags}
                                    allBoards={safeAllBoards}
                                    allTaggings={
                                      (safeAllTaggings || []) as Tagging[]
                                    }
                                    allBoardItems={safeAllBoardItems}
                                    allAttachments={allAttachments || []}
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
                                )}
                              </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />
                          </>
                        )}

                        {/* 右パネル: コメント（showCommentPanelで制御） */}
                        {showCommentPanel && (
                          <ResizablePanel
                            id="selected-comment"
                            order={commentOrder}
                            defaultSize={sizes.comment}
                            minSize={25}
                            className="rounded-lg bg-white flex flex-col min-h-0"
                          >
                            {!showListPanel && !showDetailPanel && <div></div>}

                            {/* メモ/タスク一覧表示時はコメント欄を非表示 */}
                            {!rightPanelMode && (
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
                            )}
                          </ResizablePanel>
                        )}
                      </ResizablePanelGroup>
                    );
                  })()
                : /* 非選択時: 動的パネル構成 */
                  (() => {
                    // 表示されているパネルの数を計算
                    const visibility = {
                      left: showMemo,
                      center: showTask,
                      right: showComment,
                    };
                    const visiblePanels = countVisiblePanels(visibility);
                    const orders = calculatePanelOrders(visibility);
                    const {
                      left: memoPanelOrder,
                      center: taskPanelOrder,
                      right: commentPanelOrder,
                    } = orders;

                    // 最小サイズは常に25%
                    const minPanelSize = 25;

                    // パネルサイズを計算（localStorageから復元、または固定値）
                    const combinationKey = getPanelCombinationKey(visibility);
                    const savedSizes = panelSizesUnselectedMap[
                      combinationKey
                    ] ||
                      panelSizesUnselectedMap["3panel"] || {
                        left: 33,
                        center: 34,
                        right: 33,
                      };
                    const calculatedSizes = calculatePanelSizes(
                      visiblePanels,
                      savedSizes,
                      orders,
                    );
                    const sizes = {
                      memo: calculatedSizes.left,
                      task: calculatedSizes.center,
                      comment: calculatedSizes.right,
                    };

                    // スマホ時: 1パネルずつ排他的に表示
                    if (!isDesktop) {
                      return (
                        <div className="flex flex-col flex-1 min-h-0">
                          {/* コメント表示時 */}
                          {showComment && !showMemo && !showTask && (
                            <div className="flex flex-col h-full">
                              <CommentSection
                                title="ボードコメント"
                                placeholder="ボードにコメントを追加..."
                                teamId={teamId || undefined}
                                boardId={boardId}
                                targetType="board"
                                targetOriginalId={boardId.toString()}
                                targetTitle={undefined}
                                teamMembers={teamMembers}
                              />
                            </div>
                          )}
                          {/* メモ表示時 */}
                          {showMemo && (
                            <div className="flex flex-col h-full relative">
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
                                allTags={safeAllTags}
                                allBoards={safeAllBoards}
                                allTaggings={
                                  (safeAllTaggings || []) as Tagging[]
                                }
                                allBoardItems={safeAllBoardItems}
                                allAttachments={allAttachments || []}
                                selectedMemo={selectedMemo}
                                boardId={boardId}
                                onCreateNewMemo={handleCreateNewMemo}
                                onSetRightPanelMode={setRightPanelMode}
                                onMemoTabChange={handleMemoTabChangeWithRefresh}
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
                          )}
                          {/* タスク表示時 */}
                          {showTask && !showMemo && (
                            <div className="flex flex-col h-full relative">
                              <BoardTaskSection
                                boardId={boardId}
                                rightPanelMode={rightPanelMode}
                                showMemo={showMemo}
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
                                showBoardName={false}
                                allTags={safeAllTags}
                                allBoards={safeAllBoards}
                                allTaggings={
                                  (safeAllTaggings || []) as Tagging[]
                                }
                                allBoardItems={safeAllBoardItems}
                                allAttachments={allAttachments || []}
                                selectedTask={selectedTask}
                                onCreateNewTask={handleCreateNewTask}
                                onSetRightPanelMode={setRightPanelMode}
                                onTaskTabChange={handleTaskTabChangeWithRefresh}
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
                          )}
                        </div>
                      );
                    }

                    // デスクトップ時: ResizablePanelGroupで3パネル表示
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
                              defaultSize={sizes.memo}
                              minSize={minPanelSize}
                              className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                            >
                              <div className="flex flex-col h-full relative">
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
                                  allTags={safeAllTags}
                                  allBoards={safeAllBoards}
                                  allTaggings={
                                    (safeAllTaggings || []) as Tagging[]
                                  }
                                  allBoardItems={safeAllBoardItems}
                                  allAttachments={allAttachments || []}
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
                              defaultSize={sizes.task}
                              minSize={minPanelSize}
                              className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                            >
                              <div className="flex flex-col h-full relative">
                                <BoardTaskSection
                                  boardId={boardId}
                                  rightPanelMode={rightPanelMode}
                                  showMemo={showMemo}
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
                                  showBoardName={false}
                                  allTags={safeAllTags}
                                  allBoards={safeAllBoards}
                                  allTaggings={
                                    (safeAllTaggings || []) as Tagging[]
                                  }
                                  allBoardItems={safeAllBoardItems}
                                  allAttachments={allAttachments || []}
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
                            defaultSize={sizes.comment}
                            minSize={minPanelSize}
                            className="rounded-lg bg-white flex flex-col min-h-0"
                          >
                            {/* コメントのみ表示時はヘッダーを追加 */}
                            {!showMemo && !showTask && <div></div>}

                            {/* メモ/タスク一覧表示時はコメント欄を非表示 */}
                            {!rightPanelMode && (
                              <CommentSection
                                title="ボードコメント"
                                placeholder="ボードにコメントを追加..."
                                teamId={teamId || undefined}
                                targetType="board"
                                targetOriginalId={boardId.toString()}
                                boardId={boardId}
                                teamMembers={teamMembers}
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
                            )}
                          </ResizablePanel>
                        )}
                      </ResizablePanelGroup>
                    );
                  })()}
            </>
          ) : (
            <>
              {/* 個人モード または チームモードでメモ/タスク一覧表示時: 2パネル構造 */}
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
                allTags={safeAllTags}
                allBoards={safeAllBoards}
                allTaggings={(safeAllTaggings || []) as Tagging[]}
                allBoardItems={safeAllBoardItems}
                allAttachments={allAttachments || []}
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
                showMemo={showMemo}
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
                showBoardName={false}
                allTags={safeAllTags}
                allBoards={safeAllBoards}
                allTaggings={(safeAllTaggings || []) as Tagging[]}
                allBoardItems={safeAllBoardItems}
                allAttachments={allAttachments || []}
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

      {/* 右側：詳細表示（個人モード）またはメモ/タスク一覧（チームモード） */}
      {(!teamMode || rightPanelMode !== null) && (
        <BoardRightPanel
          isOpen={
            teamMode
              ? rightPanelMode !== null // チーム側: メモ/タスク一覧表示時のみ
              : selectedMemo !== null ||
                selectedTask !== null ||
                rightPanelMode !== null // 個人側: 従来通り
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
          teamMode={teamMode}
          teamId={teamId || null}
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

      {/* モバイル右下FABボタン */}
      {showMemo && activeMemoTab !== "deleted" && (
        <MobileFabButton type="memo" teamMode={teamMode} show={true} />
      )}
      {!showMemo && showTask && activeTaskTab !== "deleted" && (
        <MobileFabButton type="task" teamMode={teamMode} show={true} />
      )}
    </div>
  );
}

export default memo(BoardDetailScreen);
