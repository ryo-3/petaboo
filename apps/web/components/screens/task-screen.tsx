"use client";

import TaskEditor from "@/components/features/task/task-editor";
import { CSVImportModal } from "@/components/features/task/csv-import-modal";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete";
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
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import { useTabChange } from "@/src/hooks/use-tab-change";
import { useDeletedTasks, useTasks } from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useBoards } from "@/src/hooks/use-boards";
import { useTags } from "@/src/hooks/use-tags";
import TagManagementModal from "@/components/ui/tag-management/tag-management-modal";
import { useAllTaggings, useAllBoardItems } from "@/src/hooks/use-all-data";
import type { DeletedTask, Task } from "@/src/types/task";
import { getTaskDisplayOrder } from "@/src/utils/domUtils";
import { createToggleHandlerWithTabClear } from "@/src/utils/toggleUtils";
import { useCallback, useEffect, useRef, useState } from "react";

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

  // 全データ事前取得（ちらつき解消）
  const { data: allTaggings } = useAllTaggings();
  const { data: allBoardItems } = useAllBoardItems();

  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    initialSelectionMode,
  );

  // URL からの初期タスク選択
  useEffect(() => {
    if (initialTaskId && tasks && !selectedTask) {
      const targetTask = tasks.find(
        (task) => task.id.toString() === initialTaskId,
      );
      if (targetTask) {
        onSelectTask(targetTask);
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

  // 通常タスクでの次のタスク選択ハンドラー（実際の画面表示順序に基づく）
  const handleTaskDeleteAndSelectNext = (
    deletedTask: Task,
    preDeleteDisplayOrder?: number[],
  ) => {
    if (!tasks) return;

    // 削除されたタスクが現在のタブと異なるステータスの場合は右パネルを閉じるだけ
    if (deletedTask.status !== activeTab) {
      setTaskScreenMode("list");
      onClearSelection?.(); // 選択状態のみクリア
      return;
    }

    // 削除されたタスクを除外してフィルター
    const filteredTasks = tasks.filter(
      (t) => t.status === activeTab && t.id !== deletedTask.id,
    );

    // 削除前のDOM順序を使用、なければ現在の順序
    const displayOrder = preDeleteDisplayOrder || getTaskDisplayOrder();

    // DOMベースで次のタスクを直接選択
    const deletedTaskIndex = displayOrder.indexOf(deletedTask.id);

    let nextTaskId = null;

    if (deletedTaskIndex !== -1) {
      // DOM順序で削除されたタスクの次のタスクを探す
      for (let i = deletedTaskIndex + 1; i < displayOrder.length; i++) {
        const candidateId = displayOrder[i];
        if (filteredTasks.some((t) => t.id === candidateId)) {
          nextTaskId = candidateId;
          break;
        }
      }

      // 次がない場合は前のタスクを探す
      if (!nextTaskId) {
        for (let i = deletedTaskIndex - 1; i >= 0; i--) {
          const candidateId = displayOrder[i];
          if (filteredTasks.some((t) => t.id === candidateId)) {
            nextTaskId = candidateId;
            break;
          }
        }
      }
    }

    if (nextTaskId) {
      const nextTask = filteredTasks.find((t) => t.id === nextTaskId);

      if (nextTask) {
        // DOM監視
        setTimeout(() => {
          document.querySelector("[data-task-editor]");
        }, 100);

        onSelectTask(nextTask, true);
        setTaskScreenMode("view");
      } else {
        setTaskScreenMode("list");
        onClearSelection?.(); // ホームに戻らずに選択状態だけクリア
      }
    } else {
      setTaskScreenMode("list");
      onClearSelection?.(); // ホームに戻らずに選択状態だけクリア
    }
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

  // 安全なデータ配布用
  const safeAllTaggings = allTaggings || [];
  const safeAllBoardItems = allBoardItems || [];

  // 除外アイテムIDでフィルタリングされたタスク
  const filteredTasks =
    tasks?.filter((task) => !excludeItemIds.includes(task.id)) || [];

  // ボードフィルターから除外するボードをフィルタリング
  const filteredBoards =
    boards?.filter((board) => board.id !== excludeBoardIdFromFilter) || [];

  return (
    <div className="flex h-full bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${taskScreenMode === "list" ? "w-full" : "w-[44%]"} ${taskScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-3 pl-5 pr-2 flex flex-col transition-all duration-300 relative`}
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

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={taskScreenMode !== "list"}
        onClose={handleRightPanelClose}
      >
        {taskScreenMode === "create" && (
          <TaskEditor
            task={null}
            onClose={() => setTaskScreenMode("list")}
            onSelectTask={onSelectTask}
            teamMode={teamMode}
            teamId={teamId}
            onSaveComplete={(savedTask, isNewTask, isContinuousMode) => {
              console.log("🎯 [TaskScreen] onSaveComplete:", {
                taskId: savedTask.id,
                isNewTask,
                isContinuousMode,
                teamMode,
                teamId,
              });

              if (isNewTask && !isContinuousMode) {
                // 連続作成モードOFFの場合のみ作成されたタスクを選択状態にする
                console.log("🎯 [TaskScreen] タスクを選択状態にします");
                onSelectTask(savedTask);
                setTaskScreenMode("view");
              } else if (isNewTask && isContinuousMode) {
                console.log(
                  "🎯 [TaskScreen] 連続作成モード: 選択状態にしません",
                );
                // 連続作成モードの場合は、タスク選択を解除してURLパラメーターもクリア
                onSelectTask(null);
              }
              // 連続作成モードONの場合は何もしない（TaskEditor内でフォームリセット）
            }}
            preloadedTags={tags || []}
            preloadedBoards={boards || []}
            preloadedTaggings={safeAllTaggings}
            preloadedBoardItems={safeAllBoardItems}
          />
        )}
        {taskScreenMode === "view" && selectedTask && (
          <TaskEditor
            task={selectedTask}
            onClose={() => setTaskScreenMode("list")}
            onSelectTask={onSelectTask}
            onClosePanel={() => setTaskScreenMode("list")}
            onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
            teamMode={teamMode}
            teamId={teamId}
            preloadedTags={tags || []}
            preloadedBoards={boards || []}
            preloadedTaggings={safeAllTaggings}
            preloadedBoardItems={safeAllBoardItems}
          />
        )}
        {taskScreenMode === "view" && selectedDeletedTask && (
          <>
            <TaskEditor
              task={selectedDeletedTask}
              onClose={() => setTaskScreenMode("list")}
              onDelete={() => selectNextDeletedTask(selectedDeletedTask)}
              onRestore={() =>
                handleDeletedTaskRestoreAndSelectNext(selectedDeletedTask)
              }
              teamMode={teamMode}
              teamId={teamId}
              preloadedTags={tags || []}
              preloadedBoards={boards || []}
              preloadedTaggings={safeAllTaggings}
              preloadedBoardItems={safeAllBoardItems}
            />
          </>
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
            preloadedTags={tags || []}
            preloadedBoards={boards || []}
            preloadedTaggings={safeAllTaggings}
            preloadedBoardItems={safeAllBoardItems}
          />
        )}
      </RightPanel>

      {/* 一括削除確認モーダル */}
      <DeleteModal />

      {/* 一括復元確認モーダル */}
      <RestoreModal />

      {/* CSVインポートモーダル */}
      <CSVImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
      />

      {/* タグ管理モーダル */}
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
