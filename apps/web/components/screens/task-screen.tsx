"use client";

import TaskEditor from "@/components/features/task/task-editor";
import { TaskCsvImport } from "@/components/features/task/task-csv-import";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete-wrapper";
import { useTasksBulkRestore } from "@/components/features/task/use-task-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import SelectionMenuButton from "@/components/ui/buttons/selection-menu-button";
import { useSortOptions } from "@/hooks/use-sort-options";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useBulkProcessNotifications } from "@/src/hooks/use-bulk-process-notifications";
import { useDeletedItemOperations } from "@/src/hooks/use-deleted-item-operations";
import { useDeletionLid } from "@/src/hooks/use-deletion-lid";
import { useItemDeselect } from "@/src/hooks/use-item-deselect";
import { useUnifiedRestoration } from "@/src/hooks/use-unified-restoration";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import { useTabChange } from "@/src/hooks/use-tab-change";
import {
  useDeletedTasks,
  useTasks,
  usePermanentDeleteTask,
} from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useTeamContext } from "@/contexts/team-context";
import { useTeamDetail } from "@/src/contexts/team-detail-context";
import {
  useBoards,
  useItemBoards,
  useTeamItemBoards,
} from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useTaskDeleteWithNextSelection } from "@/src/hooks/use-memo-delete-with-next-selection";
import TagManagementModal from "@/components/ui/tag-management/tag-management-modal";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import type { DeletedTask, Task } from "@/src/types/task";
import { OriginalIdUtils } from "@/src/types/common";
import { getTaskDisplayOrder } from "@/src/utils/domUtils";
import { createToggleHandlerWithTabClear } from "@/src/utils/toggleUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import { ControlPanelLayout } from "@/components/layout/control-panel-layout";
import CommentSection from "@/components/features/comments/comment-section";
import AttachmentGallery from "@/components/features/attachments/attachment-gallery";
import { useAttachmentManager } from "@/src/hooks/use-attachment-manager";
import ItemEditorFooter from "@/components/mobile/item-editor-footer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import type { TeamMember } from "@/src/hooks/use-team-detail";

type TaskScreenMode = "list" | "view" | "create" | "edit";

// モバイル版画像・ファイル一覧表示コンポーネント（タスク用）
function MobileAttachmentView({
  selectedTask,
  teamId,
}: {
  selectedTask: Task | null;
  teamId?: number;
}) {
  const attachmentManager = useAttachmentManager({
    itemType: "task",
    item: selectedTask,
    teamMode: !!teamId,
    teamId,
    isDeleted: false,
  });

  const {
    attachments,
    pendingImages,
    pendingDeletes,
    handleFilesSelect,
    handleDeleteAttachment,
    handleDeletePendingImage,
    handleRestoreAttachment,
    isDeleting,
    isUploading,
  } = attachmentManager;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="pl-2 pr-2 pt-2 pb-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">画像・ファイル</h2>
          {attachments.length > 0 && (
            <span className="text-sm text-gray-500">
              ({attachments.length}枚)
            </span>
          )}
        </div>
        <PhotoButton
          onFilesSelect={handleFilesSelect}
          multiple={true}
          buttonSize="size-9"
          iconSize="size-5"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {attachments.length === 0 && pendingImages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            添付ファイルはありません
          </div>
        ) : (
          <AttachmentGallery
            attachments={attachments}
            onDelete={handleDeleteAttachment}
            isDeleting={isDeleting}
            pendingImages={pendingImages}
            onDeletePending={handleDeletePendingImage}
            pendingDeletes={pendingDeletes}
            onRestore={handleRestoreAttachment}
            isUploading={isUploading}
          />
        )}
      </div>
    </div>
  );
}

interface TaskScreenProps {
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
  onSelectTask: (task: Task | null, fromFullList?: boolean) => void;
  onSelectDeletedTask: (
    task: DeletedTask | null,
    fromFullList?: boolean,
  ) => void;
  onClose: () => void;
  onClearSelection?: () => void; // 選択状態だけクリアする関数
  onScreenModeChange?: (mode: string) => void; // 画面モード変更通知
  rightPanelDisabled?: boolean; // 右パネル無効化（ボードから呼び出される場合）
  hideHeaderButtons?: boolean; // ヘッダーボタンを非表示（ボードから呼び出される場合）
  hideBulkActionButtons?: boolean; // 一括操作ボタンを非表示（ボードから呼び出される場合）
  onAddToBoard?: (taskIds: number[]) => void; // ボードに追加（ボードから呼び出される場合のみ）
  forceShowBoardName?: boolean; // ボード名表示を強制的に有効化（ボードから呼び出される場合）
  excludeBoardId?: number; // 指定されたボードに登録済みのタスクを除外（ボードから呼び出される場合）
  initialSelectionMode?: "select" | "check"; // 初期選択モード
  // ボード詳細から呼び出された場合の除外アイテムリスト（originalId）
  excludeItemIds?: string[];
  // ボードフィルターの選択肢から除外するボードID
  excludeBoardIdFromFilter?: number;
  // URL連動
  initialTaskId?: string | null;
  // チームメンバー（コメント機能用）
  teamMembers?: TeamMember[];
  // チーム用の未保存変更管理（オプション）
  taskEditorHasUnsavedChangesRef?: React.MutableRefObject<boolean>;
  taskEditorShowConfirmModalRef?: React.MutableRefObject<(() => void) | null>;

  // 統一フック（最上位から受け取り）
  unifiedOperations: {
    deleteItem: {
      mutateAsync: (id: number) => Promise<any>;
      isPending: boolean;
    };
    restoreItem: {
      mutateAsync: (originalId: string) => Promise<any>;
      isPending: boolean;
    };
  };
}

function TaskScreen({
  selectedTask,
  selectedDeletedTask,
  onSelectTask,
  onSelectDeletedTask,
  onClose,
  onClearSelection,
  onScreenModeChange,
  hideHeaderButtons = false,
  hideBulkActionButtons = false,
  onAddToBoard,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  forceShowBoardName: _ = false,
  excludeBoardId,
  initialSelectionMode = "select",
  excludeItemIds = [],
  excludeBoardIdFromFilter,
  initialTaskId,
  unifiedOperations,
  teamMembers = [],
  taskEditorHasUnsavedChangesRef,
  taskEditorShowConfirmModalRef,
}: TaskScreenProps) {
  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
  const teamId = teamIdRaw ?? undefined; // Convert null to undefined for hook compatibility
  // TeamDetailContext（チームモードのみ）
  const teamDetailContext = teamMode ? useTeamDetail() : null;
  // 一括処理中断通知の監視
  useBulkProcessNotifications();

  // データ取得
  const {
    data: tasks,
    isLoading: taskLoading,
    error: taskError,
  } = useTasks({ teamMode, teamId }) as {
    data: Task[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  const { data: deletedTasks } = useDeletedTasks({ teamMode, teamId });
  const { preferences } = useUserPreferences(1);
  const { data: personalBoards } = useBoards("normal", !teamMode);
  const { data: teamBoards } = useTeamBoards(teamId || null, "normal");
  const boards = teamMode ? teamBoards : personalBoards;
  const { data: personalTags } = useTags({ enabled: !teamMode });
  const { data: teamTags } = useTeamTags(teamId ?? 0, { enabled: teamMode });
  const tags = teamMode ? teamTags : personalTags;

  // 選択中のタスクに紐づくボード情報を取得（フェーズ1対応）
  const selectedTaskId = OriginalIdUtils.fromItem(selectedTask);
  const { data: personalTaskItemBoards = [] } = useItemBoards(
    "task",
    teamMode ? undefined : selectedTaskId,
  );
  const { data: teamTaskItemBoards = [] } = useTeamItemBoards(
    teamMode ? teamId || 0 : 0,
    "task",
    teamMode ? selectedTaskId : undefined,
  );
  const itemBoards = teamMode ? teamTaskItemBoards : personalTaskItemBoards;

  // 削除済みタスクの完全削除フック
  const permanentDeleteTask = usePermanentDeleteTask();

  // 全データ事前取得（ちらつき解消）
  const { data: allTaggings } = useAllTaggings();
  const { data: allBoardItems } = useAllBoardItems(
    teamMode ? teamId : undefined,
  );

  // allBoardItems監視（デバッグ用 - 削除予定）
  // useEffect(() => {
  //   console.log("🔍 TaskScreen allBoardItems更新", { ... });
  // }, [allBoardItems, teamMode, teamId]);

  // チーム用タグデータ取得
  const { data: allTeamTaggings } = useAllTeamTaggings(teamId || 0);

  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    initialSelectionMode,
  );

  // URL からの初期タスク選択（初回のみ）
  const initialTaskIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialTaskId) {
      // selectedTaskがある場合、refを同期
      if (selectedTask && selectedTask.id.toString() === initialTaskId) {
        if (initialTaskIdRef.current !== initialTaskId) {
          initialTaskIdRef.current = initialTaskId;
        }
      }
      // initialTaskIdが変更され、かつselectedTaskがない場合のみ自動選択を実行
      else if (
        tasks &&
        !selectedTask &&
        initialTaskId !== initialTaskIdRef.current
      ) {
        const targetTask = tasks.find(
          (task) => task.id.toString() === initialTaskId,
        );
        if (targetTask) {
          initialTaskIdRef.current = initialTaskId;
          onSelectTask(targetTask);
        }
      }
    } else {
      // initialTaskIdがnullになった場合はrefもリセット
      if (initialTaskIdRef.current !== null) {
        initialTaskIdRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTaskId]);

  // 並び替え管理
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sortOptions, setSortOptions, getVisibleSortOptions } =
    useSortOptions("task");

  // 編集日表示管理
  const [showEditDate, setShowEditDate] = useState(false);

  // ボード名表示管理
  const [showBoardName, setShowBoardName] = useState(false); // デフォルトで非表示

  // タグ表示管理
  const [showTagDisplay, setShowTagDisplay] = useState(false);

  // ボードフィルター管理
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>(
    excludeBoardId ? [excludeBoardId] : [],
  );
  const [boardFilterMode, setBoardFilterMode] = useState<"include" | "exclude">(
    excludeBoardId ? "exclude" : "include",
  );

  // タグ管理モーダルの状態
  const [isTagManagementModalOpen, setIsTagManagementModalOpen] =
    useState(false);

  // タグフィルター管理
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<"include" | "exclude">(
    "include",
  );

  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // 復元ボタンの参照
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // 削除完了時に蓋を閉じる処理
  useDeletionLid(() => setIsRightLidOpen(false));

  // アニメーション状態
  const [isDeleting, setIsDeleting] = useState(false);
  // 蓋アニメーション状態
  const [isLidOpen, setIsLidOpen] = useState(false);
  const [, setIsRightLidOpen] = useState(false);

  // 復元の状態
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreLidOpen, setIsRestoreLidOpen] = useState(false);
  const [isIndividualRestoring, setIsIndividualRestoring] = useState(false);

  // CSVインポートモーダルの状態
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  // 共通screen状態管理
  const {
    screenMode: taskScreenMode,
    setScreenMode: setTaskScreenModeInternal,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    columnCount,
    setColumnCount,
    checkedItems: checkedTasks,
    setCheckedItems: setCheckedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    setCheckedDeletedItems: setCheckedDeletedTasks,
    effectiveColumnCount,
  } = useScreenState(
    { type: "task", defaultActiveTab: "todo", defaultColumnCount: 2 },
    "list" as TaskScreenMode,
    selectedTask,
    selectedDeletedTask,
    preferences || undefined,
  );

  // チームモードで新規作成状態をContextに反映
  useEffect(() => {
    if (teamDetailContext) {
      teamDetailContext.setIsCreatingTask(taskScreenMode === "create");
    }
  }, [taskScreenMode, teamDetailContext]);

  // モバイル版タスクエディターのタブ切り替え管理（チームモードのみ）
  const [taskEditorTab, setTaskEditorTab] = useState<
    "task" | "comment" | "image"
  >("task");

  // onSelectTaskの最新値をrefで保持
  const onSelectTaskRef = useRef(onSelectTask);
  onSelectTaskRef.current = onSelectTask;

  // モバイル版タスクエディターのタブ切り替えイベントをリッスン
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tab: "task" | "comment" | "image";
      }>;
      setTaskEditorTab(customEvent.detail.tab);
    };

    const handleBackRequest = () => {
      // タスクエディターを閉じてリストに戻る（refから最新の関数を取得）
      onSelectTaskRef.current(null);
    };

    // チーム用と個人用の両方のイベントをリッスン
    const eventName = teamMode
      ? "team-task-editor-tab-change"
      : "task-editor-tab-change";
    const backEventName = teamMode
      ? "team-task-editor-mobile-back-requested"
      : "task-editor-mobile-back-requested";

    window.addEventListener(eventName, handleTabChange);
    window.addEventListener(backEventName, handleBackRequest);

    return () => {
      window.removeEventListener(eventName, handleTabChange);
      window.removeEventListener(backEventName, handleBackRequest);
    };
  }, [teamMode]);

  // 画面モード変更のラッパー（親に通知）
  const setTaskScreenMode = useCallback(
    (mode: TaskScreenMode) => {
      setTaskScreenModeInternal(mode);
      onScreenModeChange?.(mode);
    },
    [setTaskScreenModeInternal, onScreenModeChange],
  );

  // タブ変更ハンドラー（useTabChangeをトップレベルで呼び出し）
  const tabChangeHandler = useTabChange({
    setActiveTab,
    setScreenMode: (mode: string) => {
      setTaskScreenMode(mode as TaskScreenMode);
      onClearSelection?.();
    },
  });

  // 一括削除ボタンの表示制御
  const { showDeleteButton } = useBulkDeleteButton({
    activeTab,
    deletedTabName: "deleted",
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    isDeleting,
    isRestoring: isRestoreLidOpen,
  });

  // 全選択機能
  const { isAllSelected, handleSelectAll } = useSelectAll({
    activeTab,
    deletedTabName: "deleted",
    items: tasks || null,
    deletedItems: deletedTasks || null,
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    setCheckedItems: setCheckedTasks,
    setCheckedDeletedItems: setCheckedDeletedTasks,
    filterFn: (task, tab) => task.status === tab,
    currentMode: "task",
  });

  // 選択解除処理
  const handleItemDeselect = useItemDeselect(
    selectedTask,
    selectedDeletedTask,
    () => onClearSelection?.(),
    (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
  );

  // 型キャストの統一化
  const activeTabTyped = activeTab as
    | "todo"
    | "in_progress"
    | "completed"
    | "deleted";

  // 一括削除関連
  const { handleBulkDelete, DeleteModal, currentDisplayCount } =
    useTasksBulkDelete({
      activeTab: activeTabTyped,
      checkedTasks,
      checkedDeletedTasks,
      setCheckedTasks,
      setCheckedDeletedTasks,
      tasks,
      deletedTasks,
      onTaskDelete: handleItemDeselect,
      // onDeletedTaskDelete: handleItemDeselect, // 削除済みタスクはReact Query自動更新で処理
      deleteButtonRef,
      setIsDeleting,
      setIsLidOpen,
      viewMode,
      teamMode,
      teamId,
    });

  // 一括復元関連
  const {
    handleBulkRestore,
    RestoreModal,
    currentDisplayCount: currentRestoreDisplayCount,
  } = useTasksBulkRestore({
    activeTab: activeTab as "normal" | "deleted",
    checkedDeletedTasks,
    setCheckedDeletedTasks,
    deletedTasks,
    onDeletedTaskRestore: handleItemDeselect,
    restoreButtonRef,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
  });

  // 削除済みタスク操作の共通ロジック
  const {
    selectNextDeletedItem: selectNextDeletedTask,
    handleRestoreAndSelectNext: handleDeletedTaskRestoreAndSelectNext,
  } = useDeletedItemOperations({
    deletedItems: deletedTasks || null,
    onSelectDeletedItem: onSelectDeletedTask,
    setScreenMode: (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
    editorSelector: "[data-task-editor]",
    restoreOptions: { isRestore: true, onSelectWithFromFlag: true },
  });

  // 統一復元フック（新しいシンプル実装）
  const { handleRestoreAndSelectNext: unifiedRestoreAndSelectNext } =
    useUnifiedRestoration({
      itemType: "task",
      deletedItems: deletedTasks || null,
      selectedDeletedItem: selectedDeletedTask || null,
      onSelectDeletedItem: onSelectDeletedTask,
      setActiveTab,
      setScreenMode: (mode: string) =>
        setTaskScreenMode(mode as TaskScreenMode),
      teamMode,
      teamId,
    });

  // DOMポーリング削除フック（メモと同じ方式）
  const { handleDeleteWithNextSelection, checkDomDeletionAndSelectNext } =
    useTaskDeleteWithNextSelection({
      tasks: tasks?.filter((t) => t.status === activeTab),
      onSelectTask: (task: Task | null) => {
        if (task) {
          onSelectTask(task);
          setTaskScreenMode("view");
        } else {
          setTaskScreenMode("list");
          onClearSelection?.();
        }
      },
      setTaskScreenMode,
      onDeselectAndStayOnTaskList: () => {
        setTaskScreenMode("list");
        onClearSelection?.();
      },
      handleRightEditorDelete: () => {
        // 何もしない（削除処理は外部で実行済み）
      },
      setIsRightLidOpen,
    });

  // DOM削除確認（タスク一覧が変更されたときにチェック）
  useEffect(() => {
    checkDomDeletionAndSelectNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 通常タスク削除（DOMポーリング方式）
  const handleTaskDeleteAndSelectNext = async (deletedTask: Task) => {
    if (!tasks || unifiedOperations.deleteItem.isPending) return;

    // 削除されたタスクが現在のタブと異なるステータスの場合は右パネルを閉じるだけ
    if (deletedTask.status !== activeTab) {
      setTaskScreenMode("list");
      onClearSelection?.();
      return;
    }

    try {
      // API削除実行
      await unifiedOperations.deleteItem.mutateAsync(deletedTask.id);

      // DOMポーリング削除フックによる次選択処理
      handleDeleteWithNextSelection(deletedTask);
    } catch (error) {}
  };

  // 選択ハンドラーパターン
  const {
    handleSelectItem: handleSelectTaskBase,
    handleSelectDeletedItem: handleSelectDeletedTask,
    handleCreateNew,
    handleRightPanelClose,
    handleTabChange,
  } = useSelectionHandlers<Task, DeletedTask>({
    setScreenMode: (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
    onSelectItem: onSelectTask,
    onSelectDeletedItem: onSelectDeletedTask,
    onClearSelection,
    onClose: onClose,
  });

  // タスク選択ハンドラー
  const handleSelectTask = (task: Task) => {
    handleSelectTaskBase(task);
  };

  // ヘッダーからの新規タスク作成イベントをリッスン（チームモードのみ）
  useEffect(() => {
    if (!teamMode) return;

    const handleTeamTaskCreate = () => {
      handleCreateNew();
    };

    window.addEventListener("team-task-create", handleTeamTaskCreate);

    return () => {
      window.removeEventListener("team-task-create", handleTeamTaskCreate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMode]);

  // 安全なデータ配布用
  const safeAllTaggings = allTaggings || [];
  const safeAllBoardItems = allBoardItems || [];
  const safeAllTeamTaggings = allTeamTaggings || [];

  // 除外アイテムIDでフィルタリングされたタスク（originalIdで比較）
  const filteredTasks =
    tasks?.filter(
      (task) => !excludeItemIds.includes(task.originalId || task.id.toString()),
    ) || [];

  // ボードフィルターから除外するボードをフィルタリング
  const filteredBoards =
    boards?.filter((board) => board.id !== excludeBoardIdFromFilter) || [];

  // 左パネルのコンテンツ
  const leftPanelContent = (
    <div
      className={`${hideHeaderButtons ? "pt-2 md:pt-3" : "pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2"} flex flex-col h-full relative`}
    >
      <DesktopUpper
        currentMode="task"
        activeTab={activeTabTyped}
        onTabChange={handleTabChange(tabChangeHandler)}
        onCreateNew={handleCreateNew}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        columnCount={columnCount}
        onColumnCountChange={setColumnCount}
        rightPanelMode={taskScreenMode === "list" ? "hidden" : "view"}
        selectionMode={selectionMode}
        onSelectionModeChange={(mode) => {
          setSelectionMode(mode);
          // checkモードからselectモードに切り替える時、選択状態をクリア
          if (mode === "select") {
            setCheckedTasks(new Set());
            setCheckedDeletedTasks(new Set());
          }
        }}
        onSelectAll={handleSelectAll}
        isAllSelected={isAllSelected}
        sortOptions={getVisibleSortOptions(activeTab)}
        onSortChange={setSortOptions}
        showEditDate={showEditDate}
        onShowEditDateChange={setShowEditDate}
        showBoardName={showBoardName}
        onShowBoardNameChange={setShowBoardName}
        showTagDisplay={showTagDisplay}
        onShowTagDisplayChange={setShowTagDisplay}
        boards={filteredBoards}
        selectedBoardIds={selectedBoardIds}
        onBoardFilterChange={setSelectedBoardIds}
        filterMode={boardFilterMode}
        onFilterModeChange={setBoardFilterMode}
        tags={tags || []}
        selectedTagIds={selectedTagIds}
        onTagFilterChange={setSelectedTagIds}
        tagFilterMode={tagFilterMode}
        onTagFilterModeChange={setTagFilterMode}
        normalCount={0} // タスクでは使わない
        deletedTasksCount={deletedTasks?.length || 0}
        todoCount={tasks?.filter((task) => task.status === "todo").length || 0}
        inProgressCount={
          tasks?.filter((task) => task.status === "in_progress").length || 0
        }
        completedCount={
          tasks?.filter((task) => task.status === "completed").length || 0
        }
        hideAddButton={hideHeaderButtons}
        onCsvImport={() => setIsCsvImportModalOpen(true)}
        teamMode={teamMode}
        hideControls={false}
        floatControls={true}
        marginBottom=""
        headerMarginBottom="mb-1.5"
      />

      <DesktopLower
        currentMode="task"
        activeTab={activeTabTyped}
        viewMode={viewMode}
        effectiveColumnCount={effectiveColumnCount}
        isLoading={taskLoading}
        error={taskError}
        selectionMode={selectionMode}
        sortOptions={getVisibleSortOptions(activeTab)}
        showEditDate={showEditDate}
        showBoardName={showBoardName}
        showTags={showTagDisplay}
        selectedBoardIds={selectedBoardIds}
        boardFilterMode={boardFilterMode}
        selectedTagIds={selectedTagIds}
        tagFilterMode={tagFilterMode}
        tasks={filteredTasks}
        deletedTasks={deletedTasks || []}
        selectedTask={selectedTask}
        selectedDeletedTask={selectedDeletedTask}
        checkedTasks={checkedTasks}
        checkedDeletedTasks={checkedDeletedTasks}
        onToggleCheckTask={createToggleHandlerWithTabClear(
          checkedTasks,
          setCheckedTasks,
          [setCheckedDeletedTasks],
        )}
        onToggleCheckDeletedTask={createToggleHandlerWithTabClear(
          checkedDeletedTasks,
          setCheckedDeletedTasks,
          [setCheckedTasks],
        )}
        onSelectTask={handleSelectTask}
        onSelectDeletedTask={handleSelectDeletedTask}
        allTags={tags || []}
        allBoards={boards || []}
        allTaggings={safeAllTaggings}
        allTeamTaggings={safeAllTeamTaggings}
        allBoardItems={safeAllBoardItems}
        teamMode={teamMode}
        teamId={teamId}
      />

      {/* 一括操作ボタン */}
      {!hideBulkActionButtons && (
        <BulkActionButtons
          showDeleteButton={showDeleteButton}
          deleteButtonCount={currentDisplayCount}
          onDelete={() => {
            handleBulkDelete();
          }}
          deleteButtonRef={deleteButtonRef}
          isDeleting={isLidOpen}
          deleteVariant={activeTab === "deleted" ? "danger" : undefined}
          showRestoreButton={
            activeTab === "deleted" &&
            !isDeleting &&
            (checkedDeletedTasks.size > 0 ||
              (isRestoring && currentRestoreDisplayCount > 0))
          }
          restoreCount={currentRestoreDisplayCount}
          onRestore={() => {
            // 復元ボタンを押した瞬間に削除ボタンを非表示にする
            setIsRestoreLidOpen(true);
            handleBulkRestore();
          }}
          restoreButtonRef={restoreButtonRef}
          isRestoring={isRestoreLidOpen}
          animatedRestoreCount={currentRestoreDisplayCount}
          useAnimatedRestoreCount={true}
          // アニメーション付きカウンター（タスク側で実装済み）
          animatedDeleteCount={currentDisplayCount}
          useAnimatedDeleteCount={true}
        />
      )}

      {/* 選択メニューボタン（通常タブでアイテム選択時） */}
      {!hideBulkActionButtons && (
        <SelectionMenuButton
          count={checkedTasks.size}
          onExport={() => {
            // TODO: エクスポート処理
          }}
          onPin={() => {
            // TODO: ピン止め処理
          }}
          onTagging={() => {
            setIsTagManagementModalOpen(true);
          }}
          onTabMove={() => {
            // TODO: タブ移動処理
          }}
          isVisible={
            activeTab !== "deleted" && checkedTasks.size > 0 && !isDeleting
          }
        />
      )}

      {/* ボード追加ボタン（ボードから呼び出された場合のみ） */}
      {onAddToBoard && checkedTasks.size > 0 && activeTab !== "deleted" && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={() => onAddToBoard(Array.from(checkedTasks))}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            選択したタスクをボードに追加 ({checkedTasks.size})
          </button>
        </div>
      )}
    </div>
  );

  // 中央パネルのコンテンツ
  const centerPanelContent = (
    <>
      {/* 新規作成モード */}
      {taskScreenMode === "create" && (
        <TaskEditor
          task={null}
          onClose={() => setTaskScreenMode("list")}
          onSelectTask={onSelectTask}
          customHeight="flex-1 min-h-0"
          showDateAtBottom={true}
          onSaveComplete={(savedTask, isNewTask, isContinuousMode) => {
            if (isNewTask && !isContinuousMode) {
              onSelectTask(savedTask);
              setTaskScreenMode("view");
            } else if (isNewTask && isContinuousMode) {
              onSelectTask(null);
            }
          }}
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings}
          preloadedBoardItems={safeAllBoardItems}
          preloadedItemBoards={itemBoards}
          unifiedOperations={unifiedOperations}
          taskEditorHasUnsavedChangesRef={taskEditorHasUnsavedChangesRef}
          taskEditorShowConfirmModalRef={taskEditorShowConfirmModalRef}
        />
      )}
      {/* 表示モード（既存タスク） */}
      {taskScreenMode === "view" && selectedTask && !selectedDeletedTask && (
        <TaskEditor
          task={selectedTask}
          onClose={() => {
            if (teamMode) {
              onClearSelection?.();
            } else {
              onSelectTask(null); // 個人モードでは選択を解除
            }
            setTaskScreenMode("list");
          }}
          onSelectTask={onSelectTask}
          onClosePanel={() => setTaskScreenMode("list")}
          onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
          createdBy={selectedTask.createdBy}
          createdByUserId={selectedTask.userId}
          createdByAvatarColor={selectedTask.avatarColor}
          customHeight="flex-1 min-h-0"
          showDateAtBottom={true}
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings}
          preloadedBoardItems={safeAllBoardItems}
          preloadedItemBoards={itemBoards}
          unifiedOperations={unifiedOperations}
          taskEditorHasUnsavedChangesRef={taskEditorHasUnsavedChangesRef}
          taskEditorShowConfirmModalRef={taskEditorShowConfirmModalRef}
        />
      )}
      {/* 表示モード（削除済みタスク） */}
      {taskScreenMode === "view" && selectedDeletedTask && !selectedTask && (
        <TaskEditor
          task={selectedDeletedTask}
          onClose={() => setTaskScreenMode("list")}
          taskEditorHasUnsavedChangesRef={taskEditorHasUnsavedChangesRef}
          taskEditorShowConfirmModalRef={taskEditorShowConfirmModalRef}
          onDelete={async () => {
            if (selectedDeletedTask && deletedTasks) {
              const currentIndex = deletedTasks.findIndex(
                (task) => task.originalId === selectedDeletedTask.originalId,
              );
              const remainingTasks = deletedTasks.filter(
                (task) => task.originalId !== selectedDeletedTask.originalId,
              );
              await permanentDeleteTask.mutateAsync(
                selectedDeletedTask.originalId,
              );
              if (remainingTasks.length > 0) {
                const nextIndex =
                  currentIndex >= remainingTasks.length
                    ? remainingTasks.length - 1
                    : currentIndex;
                onSelectDeletedTask(remainingTasks[nextIndex] || null);
              } else {
                setTaskScreenMode("list");
              }
            }
          }}
          onRestoreAndSelectNext={unifiedRestoreAndSelectNext}
          createdBy={selectedDeletedTask.createdBy}
          createdByUserId={selectedDeletedTask.userId}
          createdByAvatarColor={selectedDeletedTask.avatarColor}
          customHeight="flex-1 min-h-0"
          preloadedTags={tags || []}
          preloadedBoards={boards || []}
          preloadedTaggings={safeAllTaggings}
          preloadedBoardItems={safeAllBoardItems}
          preloadedItemBoards={itemBoards}
          unifiedOperations={unifiedOperations}
        />
      )}
    </>
  );

  // 右パネルのコンテンツ（チームモードのみコメント表示）
  const rightPanelContent =
    teamMode && selectedTask ? (
      <CommentSection
        targetType="task"
        targetOriginalId={OriginalIdUtils.fromItem(selectedTask) || ""}
        teamId={teamId || 0}
        teamMembers={teamMembers}
        title="コメント"
        placeholder="コメントを入力..."
      />
    ) : null;

  return (
    <div className="h-full">
      {/* デスクトップ表示 */}
      <div className="hidden md:block md:min-w-[1280px] h-full">
        {taskScreenMode === "list" ? (
          // リストモード: 1パネル表示
          leftPanelContent
        ) : (
          // 選択モード: 2/3パネル表示
          <ControlPanelLayout
            leftPanel={leftPanelContent}
            centerPanel={centerPanelContent}
            rightPanel={rightPanelContent}
            storageKey={
              teamMode
                ? "team-task-3panel-sizes-v2"
                : "personal-task-2panel-sizes-v1"
            }
            defaultSizes={
              teamMode
                ? { left: 25, center: 50, right: 25 }
                : { left: 35, center: 65, right: 0 }
            }
          />
        )}
      </div>

      {/* モバイル: 1パネル表示（一覧 OR タスク OR コメント OR 画像 排他的表示） */}
      <div className="md:hidden h-full flex flex-col bg-white">
        {!selectedTask &&
        !selectedDeletedTask &&
        taskScreenMode !== "create" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {leftPanelContent}
            {/* モバイル: タスク追加FABボタン（削除済みタブ以外で表示） */}
            {activeTab !== "deleted" && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent(
                      teamMode ? "team-task-create" : "personal-task-create",
                    ),
                  );
                }}
                className="md:hidden fixed bottom-16 right-2 size-9 bg-DeepBlue hover:bg-DeepBlue/90 text-white rounded-full shadow-lg flex items-center justify-center z-20 transition-all"
              >
                <svg
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>
        ) : taskEditorTab === "task" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {centerPanelContent}
          </div>
        ) : taskEditorTab === "comment" ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {rightPanelContent}
          </div>
        ) : (
          <MobileAttachmentView
            selectedTask={selectedTask || null}
            teamId={teamId}
          />
        )}
      </div>

      {/* モーダル（3パネルレイアウト外側） */}
      <DeleteModal />
      <RestoreModal />
      <TaskCsvImport
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
      />
      <TagManagementModal
        isOpen={isTagManagementModalOpen}
        onClose={() => setIsTagManagementModalOpen(false)}
        tags={
          tags?.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          })) || []
        }
        selectedItemCount={checkedTasks.size}
        itemType="task"
        selectedItems={Array.from(checkedTasks).map((id) => id.toString())}
        allItems={tasks || []}
        allTaggings={safeAllTaggings || []}
        onSuccess={() => {
          setCheckedTasks(new Set());
        }}
      />
    </div>
  );
}

export default TaskScreen;
