"use client";

import TaskEditor from "@/components/features/task/task-editor";
import { TaskCsvImport } from "@/components/features/task/task-csv-import";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete-wrapper";
import { useTasksBulkRestore } from "@/components/features/task/use-task-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import SelectionMenuButton from "@/components/ui/buttons/selection-menu-button";
import RightPanel from "@/components/ui/layout/right-panel";
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
import { useBoards } from "@/src/hooks/use-boards";
import { useTags } from "@/src/hooks/use-tags";
import { useTaskDeleteWithNextSelection } from "@/src/hooks/use-memo-delete-with-next-selection";
import TagManagementModal from "@/components/ui/tag-management/tag-management-modal";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import { useAllTeamTaggings } from "@/src/hooks/use-team-taggings";
import type { DeletedTask, Task } from "@/src/types/task";
import { getTaskDisplayOrder } from "@/src/utils/domUtils";
import { createToggleHandlerWithTabClear } from "@/src/utils/toggleUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/base/resizable";
import CommentSection from "@/components/features/comments/comment-section";

type TaskScreenMode = "list" | "view" | "create" | "edit";

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
  // ボード詳細から呼び出された場合の除外アイテムリスト
  excludeItemIds?: number[];
  // ボードフィルターの選択肢から除外するボードID
  excludeBoardIdFromFilter?: number;
  // チーム機能
  teamMode?: boolean;
  teamId?: number;
  // URL連動
  initialTaskId?: string | null;

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
  teamMode = false,
  teamId,
  initialTaskId,
  unifiedOperations,
}: TaskScreenProps) {
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
  const { data: boards } = useBoards("normal", !teamMode);
  const { data: tags } = useTags();

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
  }, [initialTaskId, tasks, selectedTask, onSelectTask]);

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

  // 3パネルサイズ管理（チームモードのみ）
  const [threePanelSizes, setThreePanelSizes] = useState<{
    left: number;
    center: number;
    right: number;
  }>(() => {
    if (typeof window !== "undefined" && teamMode) {
      const saved = localStorage.getItem("team-task-3panel-sizes-v2");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return { left: 25, center: 45, right: 30 };
  });

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

  // 画面モード変更のラッパー（親に通知）
  const setTaskScreenMode = useCallback(
    (mode: TaskScreenMode) => {
      setTaskScreenModeInternal(mode);
      onScreenModeChange?.(mode);
    },
    [setTaskScreenModeInternal, onScreenModeChange],
  );

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
  }, [tasks, checkDomDeletionAndSelectNext]);

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
  }, [teamMode, handleCreateNew]);

  // 安全なデータ配布用
  const safeAllTaggings = allTaggings || [];
  const safeAllBoardItems = allBoardItems || [];
  const safeAllTeamTaggings = allTeamTaggings || [];

  // 除外アイテムIDでフィルタリングされたタスク
  const filteredTasks =
    tasks?.filter((task) => !excludeItemIds.includes(task.id)) || [];

  // ボードフィルターから除外するボードをフィルタリング
  const filteredBoards =
    boards?.filter((board) => board.id !== excludeBoardIdFromFilter) || [];

  // チームモード＆選択時は3パネルレイアウト
  const shouldUseThreePanelLayout = teamMode && taskScreenMode !== "list";

  // デバウンス用タイマー（リサイズ終了後のみlocalStorage保存）
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  return shouldUseThreePanelLayout ? (
    // ===== 3パネルレイアウト（チームモード＆選択時） =====
    <div className="flex h-full bg-white overflow-hidden relative">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes) => {
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
            setThreePanelSizes(newSizes);

            // デバウンス：300ms後に保存（リサイズ中は保存しない）
            if (resizeTimerRef.current) {
              clearTimeout(resizeTimerRef.current);
            }
            resizeTimerRef.current = setTimeout(() => {
              localStorage.setItem(
                "team-task-3panel-sizes-v2",
                JSON.stringify(newSizes),
              );
            }, 300);
          }
        }}
        className="h-full"
      >
        {/* 左パネル：一覧 */}
        <ResizablePanel
          defaultSize={threePanelSizes.left}
          minSize={20}
          maxSize={50}
          className="flex flex-col"
        >
          <div
            className={`${hideHeaderButtons ? "pt-3" : "pt-3 pl-5 pr-2"} flex flex-col h-full relative`}
          >
            <DesktopUpper
              currentMode="task"
              activeTab={activeTabTyped}
              onTabChange={handleTabChange(
                useTabChange({
                  setActiveTab,
                  setScreenMode: (mode: string) => {
                    setTaskScreenMode(mode as TaskScreenMode);
                    onClearSelection?.(); // 選択状態もクリア
                  },
                }),
              )}
              onCreateNew={handleCreateNew}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              columnCount={columnCount}
              onColumnCountChange={setColumnCount}
              rightPanelMode="view"
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
              todoCount={
                tasks?.filter((task) => task.status === "todo").length || 0
              }
              inProgressCount={
                tasks?.filter((task) => task.status === "in_progress").length ||
                0
              }
              completedCount={
                tasks?.filter((task) => task.status === "completed").length || 0
              }
              hideAddButton={hideHeaderButtons}
              onCsvImport={() => setIsCsvImportModalOpen(true)}
              teamMode={teamMode}
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
              teamMode={teamMode}
              teamId={teamId}
              allTags={tags || []}
              allBoards={boards || []}
              allTaggings={safeAllTaggings}
              allTeamTaggings={safeAllTeamTaggings}
              allBoardItems={safeAllBoardItems}
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
                  activeTab !== "deleted" &&
                  checkedTasks.size > 0 &&
                  !isDeleting
                }
              />
            )}

            {/* ボード追加ボタン（ボードから呼び出された場合のみ） */}
            {onAddToBoard &&
              checkedTasks.size > 0 &&
              activeTab !== "deleted" && (
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
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 中央パネル：エディター */}
        <ResizablePanel
          defaultSize={threePanelSizes.center}
          minSize={35}
          className="flex flex-col min-h-0"
        >
          {/* 新規作成モード */}
          {taskScreenMode === "create" && (
            <TaskEditor
              task={null}
              onClose={() => setTaskScreenMode("list")}
              onSelectTask={onSelectTask}
              teamMode={teamMode}
              teamId={teamId}
              customHeight="flex-1 min-h-0"
              showDateAtBottom={teamMode}
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
              unifiedOperations={unifiedOperations}
            />
          )}
          {/* 表示モード（既存タスク） */}
          {taskScreenMode === "view" &&
            selectedTask &&
            !selectedDeletedTask && (
              <TaskEditor
                task={selectedTask}
                onClose={() => {
                  onClearSelection?.();
                  setTaskScreenMode("list");
                }}
                onSelectTask={onSelectTask}
                onClosePanel={() => setTaskScreenMode("list")}
                onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
                teamMode={teamMode}
                teamId={teamId}
                createdBy={selectedTask.createdBy}
                createdByUserId={selectedTask.userId}
                createdByAvatarColor={selectedTask.avatarColor}
                customHeight="flex-1 min-h-0"
                showDateAtBottom={teamMode}
                preloadedTags={tags || []}
                preloadedBoards={boards || []}
                preloadedTaggings={safeAllTaggings}
                preloadedBoardItems={safeAllBoardItems}
                unifiedOperations={unifiedOperations}
              />
            )}
          {/* 表示モード（削除済みタスク） */}
          {taskScreenMode === "view" &&
            selectedDeletedTask &&
            !selectedTask && (
              <TaskEditor
                task={selectedDeletedTask}
                onClose={() => setTaskScreenMode("list")}
                onDelete={async () => {
                  if (selectedDeletedTask && deletedTasks) {
                    const currentIndex = deletedTasks.findIndex(
                      (task) =>
                        task.originalId === selectedDeletedTask.originalId,
                    );
                    const remainingTasks = deletedTasks.filter(
                      (task) =>
                        task.originalId !== selectedDeletedTask.originalId,
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
                teamMode={teamMode}
                teamId={teamId}
                createdBy={selectedDeletedTask.createdBy}
                createdByUserId={selectedDeletedTask.userId}
                createdByAvatarColor={selectedDeletedTask.avatarColor}
                customHeight="flex-1 min-h-0"
                preloadedTags={tags || []}
                preloadedBoards={boards || []}
                preloadedTaggings={safeAllTaggings}
                preloadedBoardItems={safeAllBoardItems}
                unifiedOperations={unifiedOperations}
              />
            )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 右パネル：コメント（新規作成時は非表示） */}
        <ResizablePanel
          defaultSize={taskScreenMode === "create" ? 0 : threePanelSizes.right}
          minSize={taskScreenMode === "create" ? 0 : 25}
          maxSize={taskScreenMode === "create" ? 0 : 50}
          className="flex flex-col"
        >
          {selectedTask && (
            <CommentSection
              targetType="task"
              targetOriginalId={
                selectedTask.originalId || selectedTask.id.toString()
              }
              teamId={teamId || 0}
              teamMembers={[]}
              title="コメント"
              placeholder="コメントを入力..."
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

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
  ) : (
    // ===== 2パネルレイアウト（個人モードまたは未選択時） =====
    <div className="flex h-full bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${taskScreenMode === "list" ? "w-full" : "w-[44%]"} ${taskScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-3 pl-5 pr-2 flex flex-col relative`}
      >
        <DesktopUpper
          currentMode="task"
          activeTab={activeTabTyped}
          onTabChange={handleTabChange(
            useTabChange({
              setActiveTab,
              setScreenMode: (mode: string) => {
                setTaskScreenMode(mode as TaskScreenMode);
                onClearSelection?.();
              },
            }),
          )}
          onCreateNew={handleCreateNew}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={taskScreenMode === "list" ? "hidden" : "view"}
          selectionMode={selectionMode}
          onSelectionModeChange={(mode) => {
            setSelectionMode(mode);
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
          normalCount={0}
          deletedTasksCount={deletedTasks?.length || 0}
          todoCount={
            tasks?.filter((task) => task.status === "todo").length || 0
          }
          inProgressCount={
            tasks?.filter((task) => task.status === "in_progress").length || 0
          }
          completedCount={
            tasks?.filter((task) => task.status === "completed").length || 0
          }
          hideAddButton={hideHeaderButtons}
          onCsvImport={() => setIsCsvImportModalOpen(true)}
          teamMode={teamMode}
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
          teamMode={teamMode}
          teamId={teamId}
          allTags={tags || []}
          allBoards={boards || []}
          allTaggings={safeAllTaggings}
          allTeamTaggings={safeAllTeamTaggings}
          allBoardItems={safeAllBoardItems}
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
              setIsRestoreLidOpen(true);
              handleBulkRestore();
            }}
            restoreButtonRef={restoreButtonRef}
            isRestoring={isRestoreLidOpen}
            animatedRestoreCount={currentRestoreDisplayCount}
            useAnimatedRestoreCount={true}
            animatedDeleteCount={currentDisplayCount}
            useAnimatedDeleteCount={true}
          />
        )}

        {/* 選択メニューボタン */}
        {!hideBulkActionButtons && (
          <SelectionMenuButton
            count={checkedTasks.size}
            onExport={() => {}}
            onPin={() => {}}
            onTagging={() => {
              setIsTagManagementModalOpen(true);
            }}
            onTabMove={() => {}}
            isVisible={
              activeTab !== "deleted" && checkedTasks.size > 0 && !isDeleting
            }
          />
        )}

        {/* ボード追加ボタン */}
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

      {/* モーダル（2パネルレイアウト外側） */}
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

      {/* 右側：詳細表示エリア（2パネルレイアウトではRightPanelを使用） */}
      <RightPanel
        isOpen={taskScreenMode !== "list"}
        onClose={handleRightPanelClose}
        disableAnimation={true}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1">
            {taskScreenMode === "create" && (
              <TaskEditor
                task={null}
                onClose={() => setTaskScreenMode("list")}
                onSelectTask={onSelectTask}
                teamMode={teamMode}
                teamId={teamId}
                showDateAtBottom={teamMode}
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
                unifiedOperations={unifiedOperations}
              />
            )}
            {taskScreenMode === "view" && selectedTask && (
              <TaskEditor
                task={selectedTask}
                onClose={() => {
                  onClose();
                  setTaskScreenMode("list");
                }}
                onSelectTask={onSelectTask}
                onClosePanel={() => setTaskScreenMode("list")}
                onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
                teamMode={teamMode}
                teamId={teamId}
                createdBy={selectedTask.createdBy}
                createdByUserId={selectedTask.userId}
                createdByAvatarColor={selectedTask.avatarColor}
                showDateAtBottom={teamMode}
                preloadedTags={tags || []}
                preloadedBoards={boards || []}
                preloadedTaggings={safeAllTaggings}
                preloadedBoardItems={safeAllBoardItems}
                unifiedOperations={unifiedOperations}
              />
            )}
            {taskScreenMode === "view" && selectedDeletedTask && (
              <TaskEditor
                task={selectedDeletedTask}
                onClose={() => setTaskScreenMode("list")}
                onDelete={async () => {
                  if (selectedDeletedTask && deletedTasks) {
                    const currentIndex = deletedTasks.findIndex(
                      (task) =>
                        task.originalId === selectedDeletedTask.originalId,
                    );
                    const remainingTasks = deletedTasks.filter(
                      (task) =>
                        task.originalId !== selectedDeletedTask.originalId,
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
                teamMode={teamMode}
                teamId={teamId}
                createdBy={selectedDeletedTask.createdBy}
                createdByUserId={selectedDeletedTask.userId}
                createdByAvatarColor={selectedDeletedTask.avatarColor}
                preloadedTags={tags || []}
                preloadedBoards={boards || []}
                preloadedTaggings={safeAllTaggings}
                preloadedBoardItems={safeAllBoardItems}
                unifiedOperations={unifiedOperations}
              />
            )}
            {taskScreenMode === "edit" && selectedTask && (
              <TaskEditor
                task={selectedTask}
                onClose={() => setTaskScreenMode("view")}
                onSelectTask={onSelectTask}
                onClosePanel={() => setTaskScreenMode("list")}
                onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
                teamMode={teamMode}
                teamId={teamId}
                createdBy={selectedTask.createdBy}
                createdByUserId={selectedTask.userId}
                createdByAvatarColor={selectedTask.avatarColor}
                preloadedTags={tags || []}
                preloadedBoards={boards || []}
                preloadedTaggings={safeAllTaggings}
                preloadedBoardItems={safeAllBoardItems}
                unifiedOperations={unifiedOperations}
              />
            )}
          </div>
        </div>
      </RightPanel>
    </div>
  );
}

export default TaskScreen;
