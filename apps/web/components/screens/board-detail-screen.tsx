import BoardMemoSection from "@/components/features/board/board-memo-section";
import BoardRightPanel from "@/components/features/board/board-right-panel";
import BoardTaskSection from "@/components/features/board/board-task-section";
import { useBoardState } from "@/src/hooks/use-board-state";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import { useTeamContext } from "@/src/contexts/team-context";
import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";
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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/base/resizable";

interface BoardDetailProps {
  boardId: number;
  selectedMemo?: Memo | DeletedMemo | null;
  selectedTask?: Task | DeletedTask | null;
  onSelectMemo?: (memo: Memo | DeletedMemo | null) => void;
  onSelectTask?: (task: Task | DeletedTask | null) => void;
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
  const { isTeamMode: teamMode, teamId } = useTeamContext();
  const { setConfig } = useHeaderControlPanel();

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
    showMemo,
    showTask,
    showComment,
    setRightPanelMode,
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

  // propsから選択状態を使用（Fast Refresh対応）
  const selectedMemo = propSelectedMemo;
  const selectedTask = propSelectedTask;

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
  });

  // タブテキスト表示制御
  // モバイルフッターからのセクション切り替えイベントをリッスン
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent) => {
      const { section } = event.detail;

      if (section === "memos") {
        handleMemoToggle(!showMemo);
      } else if (section === "tasks") {
        handleTaskToggle(!showTask);
      } else if (section === "comments") {
        handleCommentToggle(!showComment);
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
  }, [
    showMemo,
    showTask,
    showComment,
    handleMemoToggle,
    handleTaskToggle,
    handleCommentToggle,
  ]);

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

  // パネル幅管理
  const resizeTimerSelected = useRef<NodeJS.Timeout | null>(null);
  const resizeTimerUnselected = useRef<NodeJS.Timeout | null>(null);
  const mountCountSelected = useRef(0);
  const mountCountUnselected = useRef(0);

  // パネル幅保存の型定義
  type PanelSizesMap = {
    [key: string]: { left: number; right: number };
  };

  // 選択時のパネル幅を取得（localStorageから復元）
  const [panelSizesSelectedMap, setPanelSizesSelectedMap] =
    useState<PanelSizesMap>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(
          "personal-board-panel-sizes-selected",
        );
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch {
            // パース失敗時はデフォルト値を使用
          }
        }
      }
      return {
        "2panel": { left: 35, right: 65 },
        "list-only": { left: 100, right: 0 },
        "detail-only": { left: 0, right: 100 },
      };
    });

  // 非選択時のパネル幅を取得（localStorageから復元）
  const [panelSizesUnselectedMap, setPanelSizesUnselectedMap] =
    useState<PanelSizesMap>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(
          "personal-board-panel-sizes-unselected",
        );
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch {
            // パース失敗時はデフォルト値を使用
          }
        }
      }
      return {
        "2panel": { left: 50, right: 50 },
        "memo-only": { left: 100, right: 0 },
        "task-only": { left: 0, right: 100 },
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

  const handlePanelResizeSelected = useCallback(
    (sizes: number[]) => {
      mountCountSelected.current += 1;
      if (mountCountSelected.current <= 1) {
        return;
      }

      if (sizes.length >= 2) {
        const showList =
          rightPanelMode === "memo-list" ||
          rightPanelMode === "task-list" ||
          (!rightPanelMode && (selectedMemo || selectedTask));
        const showDetail = selectedMemo || selectedTask;

        const combinationKey =
          showList && showDetail
            ? "2panel"
            : showList
              ? "list-only"
              : "detail-only";

        const newSizes = {
          left: sizes[0] ?? 0,
          right: sizes[1] ?? 0,
        };

        setPanelSizesSelectedMap((prev) => {
          const updated = { ...prev, [combinationKey]: newSizes };

          if (resizeTimerSelected.current) {
            clearTimeout(resizeTimerSelected.current);
          }
          resizeTimerSelected.current = setTimeout(() => {
            localStorage.setItem(
              "personal-board-panel-sizes-selected",
              JSON.stringify(updated),
            );
          }, 500);

          return updated;
        });
      }
    },
    [rightPanelMode, selectedMemo, selectedTask],
  );

  const handlePanelResizeUnselected = useCallback(
    (sizes: number[]) => {
      mountCountUnselected.current += 1;
      if (mountCountUnselected.current <= 1) {
        return;
      }

      if (sizes.length >= 2) {
        const combinationKey =
          showMemo && showTask
            ? "2panel"
            : showMemo
              ? "memo-only"
              : "task-only";

        const newSizes = {
          left: sizes[0] ?? 0,
          right: sizes[1] ?? 0,
        };

        setPanelSizesUnselectedMap((prev) => {
          const updated = { ...prev, [combinationKey]: newSizes };

          if (resizeTimerUnselected.current) {
            clearTimeout(resizeTimerUnselected.current);
          }
          resizeTimerUnselected.current = setTimeout(() => {
            localStorage.setItem(
              "personal-board-panel-sizes-unselected",
              JSON.stringify(updated),
            );
          }, 500);

          return updated;
        });
      }
    },
    [showMemo, showTask],
  );

  useEffect(
    () => () => {
      if (resizeTimerSelected.current) {
        clearTimeout(resizeTimerSelected.current);
      }
      if (resizeTimerUnselected.current) {
        clearTimeout(resizeTimerUnselected.current);
      }
    },
    [],
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
  const { data: personalTaggings, dataUpdatedAt: taggingsUpdatedAt } =
    useAllTaggings({ enabled: !teamMode });
  const { data: teamTaggings } = useAllTeamTaggings(teamId || 0, {
    enabled: teamMode,
  });
  const { data: allBoardItems } = useAllBoardItems();
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
  const allAttachments = useMemo(() => {
    const combined = [
      ...(allMemoAttachments || []),
      ...(allTaskAttachments || []),
    ];
    return combined;
  }, [allMemoAttachments, allTaskAttachments]);

  // チームモードかどうかでタグ付けデータを切り替え（dataUpdatedAtで強制再レンダリング）
  const allTaggings = useMemo(
    () => (teamMode && teamId ? teamTaggings : personalTaggings),
    [teamMode, teamId, teamTaggings, personalTaggings, taggingsUpdatedAt],
  );

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

  const boardHeaderConfig = useMemo<HeaderControlPanelConfig | null>(() => {
    const config: HeaderControlPanelConfig = {
      currentMode: "board",
      rightPanelMode: headerRightPanelMode,
      boardId,
      onBoardSettings: boardSettingsHandler,
      onBoardExport: handleExport,
      isExportDisabled: false,
      showMemo: headerShowMemo,
      showTask: headerShowTask,
      onMemoToggle: handleMemoToggle,
      onTaskToggle: handleTaskToggle,
      contentFilterRightPanelMode: rightPanelMode,
      selectionMode,
      onSelectionModeChange: handleSelectionModeChange,
      onCsvImport: handleCsvImport,
      customTitle: boardName || "ボード詳細",
      normalCount: totalNormalCount,
      completedCount,
      deletedCount: totalDeletedCount,
      teamMode,
      teamId: teamId ?? undefined,
    };

    if (teamMode) {
      config.showComment = showComment;
      config.onCommentToggle = handleCommentToggle;
    }

    return config;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    headerRightPanelMode,
    boardId,
    // boardSettingsHandler, // 関数は除外
    // handleExport, // 関数は除外
    headerShowMemo,
    headerShowTask,
    // handleMemoToggle, // 関数は除外
    // handleTaskToggle, // 関数は除外
    rightPanelMode,
    selectionMode,
    // handleSelectionModeChange, // 関数は除外
    // handleCsvImport, // 関数は除外
    boardName,
    totalNormalCount,
    completedCount,
    totalDeletedCount,
    teamMode,
    teamId,
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

    // どちらのアイテムが選択されているかで処理を分ける
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

  // 安全なデータ配布用
  const safeAllTaggings = allTaggings || [];
  const safeAllBoardItems = allBoardItems || [];
  const safeAllTags = allTags || [];
  const tagOptions = safeAllTags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color ?? undefined,
  }));
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
      <div
        className={`flex-1 flex flex-col ${selectedMemo || selectedTask ? "" : "pl-4"}`}
      >
        {selectedMemo || selectedTask || rightPanelMode
          ? // 選択時: 一覧 | 詳細 の2パネル構成
            (() => {
              const showList =
                rightPanelMode === "memo-list" ||
                rightPanelMode === "task-list" ||
                (!rightPanelMode && (selectedMemo || selectedTask));
              const showDetail = selectedMemo || selectedTask;

              const combinationKey =
                showList && showDetail
                  ? "2panel"
                  : showList
                    ? "list-only"
                    : "detail-only";
              const savedSizes = panelSizesSelectedMap[combinationKey] ||
                panelSizesSelectedMap["2panel"] || {
                  left: 35,
                  right: 65,
                };

              const sizes = {
                list: showList ? savedSizes.left : 0,
                detail: showDetail ? savedSizes.right : 0,
              };

              const listOrder = showList ? 1 : 0;
              const detailOrder = showDetail ? (showList ? 2 : 1) : 0;
              const visiblePanels = (showList ? 1 : 0) + (showDetail ? 1 : 0);

              return (
                <ResizablePanelGroup
                  key={`selected-${combinationKey}-${visiblePanels}`}
                  direction="horizontal"
                  className="flex-1"
                  onLayout={handlePanelResizeSelected}
                >
                  {/* 一覧パネル */}
                  {showList && (
                    <>
                      <ResizablePanel
                        id="selected-list"
                        order={listOrder}
                        defaultSize={sizes.list}
                        minSize={25}
                        maxSize={75}
                        className="rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200"
                      >
                        <div className="flex flex-col h-full relative">
                          {rightPanelMode === "memo-list" ? (
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
                              allTaggings={safeAllTaggings as Tagging[]}
                              allBoardItems={safeAllBoardItems}
                              allAttachments={allAttachments || []}
                              selectedTagIds={selectedTagIds}
                              tagFilterMode={tagFilterMode}
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
                          ) : rightPanelMode === "task-list" ? (
                            <BoardTaskSection
                              boardId={boardId}
                              initialBoardId={boardId}
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
                              selectedTagIds={selectedTagIds}
                              tagFilterMode={tagFilterMode}
                              allTags={safeAllTags}
                              allBoards={safeAllBoards}
                              allTaggings={safeAllTaggings as Tagging[]}
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
                          ) : selectedTask ? (
                            <BoardTaskSection
                              boardId={boardId}
                              initialBoardId={boardId}
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
                              selectedTagIds={selectedTagIds}
                              tagFilterMode={tagFilterMode}
                              allTags={safeAllTags}
                              allBoards={safeAllBoards}
                              allTaggings={safeAllTaggings as Tagging[]}
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
                          ) : selectedMemo ? (
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
                              allTaggings={safeAllTaggings as Tagging[]}
                              allBoardItems={safeAllBoardItems}
                              allAttachments={allAttachments || []}
                              selectedTagIds={selectedTagIds}
                              tagFilterMode={tagFilterMode}
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
                          ) : null}
                        </div>
                      </ResizablePanel>
                      {showDetail && <ResizableHandle withHandle />}
                    </>
                  )}

                  {/* 詳細パネル */}
                  {showDetail && (
                    <ResizablePanel
                      id="selected-detail"
                      order={detailOrder}
                      defaultSize={sizes.detail}
                      minSize={25}
                      className="rounded-lg bg-white flex flex-col min-h-0"
                    >
                      <div className="flex-1 flex flex-col relative">
                        <BoardRightPanel
                          isOpen={true}
                          boardId={boardId}
                          selectedMemo={selectedMemo}
                          selectedTask={selectedTask}
                          rightPanelMode={rightPanelMode}
                          activeMemoTab={activeMemoTab}
                          selectedItemsFromList={selectedItemsFromList}
                          allMemos={boardMemos}
                          allTasks={boardTasks}
                          allBoards={allBoards || []}
                          allTaggings={safeAllTaggings as Tagging[]}
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
                          onMemoDeleteAndSelectNext={
                            handleMemoDeleteAndSelectNext
                          }
                          onTaskDeleteAndSelectNext={
                            handleTaskDeleteAndSelectNext
                          }
                          onDeletedMemoDeleteAndSelectNext={
                            handleDeletedMemoDeleteAndSelectNext
                          }
                          onDeletedTaskDeleteAndSelectNext={
                            handleDeletedTaskDeleteAndSelectNext
                          }
                          onMemoRestoreAndSelectNext={
                            handleMemoRestoreAndSelectNext
                          }
                          onTaskRestoreAndSelectNext={
                            handleTaskRestoreAndSelectNext
                          }
                          onAddMemoToBoard={handleAddMemoToBoard}
                          onAddTaskToBoard={handleAddTaskToBoard}
                        />
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              );
            })()
          : // 非選択時: メモ | タスク の2パネル構成
            (() => {
              const combinationKey =
                showMemo && showTask
                  ? "2panel"
                  : showMemo
                    ? "memo-only"
                    : "task-only";
              const savedSizes = panelSizesUnselectedMap[combinationKey] ||
                panelSizesUnselectedMap["2panel"] || { left: 50, right: 50 };

              const sizes = {
                memo: showMemo ? savedSizes.left : 0,
                task: showTask ? savedSizes.right : 0,
              };

              const memoOrder = showMemo ? 1 : 0;
              const taskOrder = showTask ? (showMemo ? 2 : 1) : 0;
              const visiblePanels = (showMemo ? 1 : 0) + (showTask ? 1 : 0);

              if (visiblePanels === 0) {
                return <div className="flex-1" />;
              }

              return (
                <ResizablePanelGroup
                  key={`unselected-${combinationKey}-${visiblePanels}`}
                  direction="horizontal"
                  className="flex-1"
                  onLayout={handlePanelResizeUnselected}
                >
                  {/* メモパネル */}
                  {showMemo && (
                    <>
                      <ResizablePanel
                        id="unselected-memo"
                        order={memoOrder}
                        defaultSize={sizes.memo}
                        minSize={25}
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
                            allTaggings={safeAllTaggings as Tagging[]}
                            allBoardItems={safeAllBoardItems}
                            allAttachments={allAttachments || []}
                            selectedTagIds={selectedTagIds}
                            tagFilterMode={tagFilterMode}
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
                        </div>
                      </ResizablePanel>
                      {showTask && <ResizableHandle withHandle />}
                    </>
                  )}

                  {/* タスクパネル */}
                  {showTask && (
                    <ResizablePanel
                      id="unselected-task"
                      order={taskOrder}
                      defaultSize={sizes.task}
                      minSize={25}
                      className="rounded-lg bg-white flex flex-col min-h-0"
                    >
                      <div className="flex flex-col h-full relative">
                        <BoardTaskSection
                          boardId={boardId}
                          initialBoardId={boardId}
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
                          selectedTagIds={selectedTagIds}
                          tagFilterMode={tagFilterMode}
                          allTags={safeAllTags}
                          allBoards={safeAllBoards}
                          allTaggings={safeAllTaggings as Tagging[]}
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
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              );
            })()}
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
