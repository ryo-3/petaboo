"use client";

import DeletedTaskViewer, {
  DeletedTaskViewerRef,
} from "@/components/features/task/deleted-task-viewer";
import TaskEditor from "@/components/features/task/task-editor";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete";
import { useTasksBulkRestore } from "@/components/features/task/use-task-bulk-restore";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import RightPanel from "@/components/ui/layout/right-panel";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
// import {
//   BulkDeleteConfirmation,
//   BulkRestoreConfirmation,
// } from "@/components/ui/modals";
import { useDeletionLid } from "@/src/hooks/use-deletion-lid";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useDeletedTasks, useTasks } from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useSelectionHandlers } from "@/src/hooks/use-selection-handlers";
import type { DeletedTask, Task } from "@/src/types/task";
import {
  createDeletedNextSelectionHandler,
  getTaskDisplayOrder,
} from "@/src/utils/domUtils";
import { createToggleHandlerWithTabClear } from "@/src/utils/toggleUtils";
import { getDeleteButtonVisibility } from "@/src/utils/bulkButtonUtils";
import { useBulkProcessNotifications } from "@/src/hooks/use-bulk-process-notifications";
import { useItemDeselect } from "@/src/hooks/use-item-deselect";
import { useSelectAll } from "@/src/hooks/use-select-all";
import { useTabChange } from "@/src/hooks/use-tab-change";
import { useNextDeletedItemSelection } from "@/src/hooks/use-next-deleted-item-selection";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useSortOptions } from "@/hooks/use-sort-options";
import { useRef, useState } from "react";

type TaskScreenMode = "list" | "view" | "create" | "edit";

interface TaskScreenProps {
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
  onSelectTask: (task: Task | null, fromFullList?: boolean) => void;
  onSelectDeletedTask: (
    task: DeletedTask | null,
    fromFullList?: boolean
  ) => void;
  onClose: () => void;
  onClearSelection?: () => void; // 選択状態だけクリアする関数
}

function TaskScreen({
  selectedTask,
  selectedDeletedTask,
  onSelectTask,
  onSelectDeletedTask,
  onClose,
  onClearSelection,
}: TaskScreenProps) {
  // 一括処理中断通知の監視
  useBulkProcessNotifications();
  
  // データ取得
  const { data: tasks, isLoading: taskLoading, error: taskError } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();
  const { preferences } = useUserPreferences(1);

  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    "select"
  );

  // 並び替え管理
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sortOptions, setSortOptions, getVisibleSortOptions } = useSortOptions('task');

  // 編集日表示管理
  const [showEditDate, setShowEditDate] = useState(false);

  // 削除ボタンの参照
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // 復元ボタンの参照
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // 削除済みタスクビューアーの参照
  const deletedTaskViewerRef = useRef<DeletedTaskViewerRef>(null);

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

  // 共通screen状態管理
  const {
    screenMode: taskScreenMode,
    setScreenMode: setTaskScreenMode,
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
    preferences || undefined
  );

  // 一括削除ボタンの表示制御
  const { showDeleteButton, deleteButtonCount } = useBulkDeleteButton({ // eslint-disable-line @typescript-eslint/no-unused-vars
    activeTab,
    deletedTabName: "deleted",
    checkedItems: checkedTasks,
    checkedDeletedItems: checkedDeletedTasks,
    isDeleting,
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
    (mode: string) => setTaskScreenMode(mode as TaskScreenMode)
  );

  // 型キャストの統一化
  const activeTabTyped = activeTab as
    | "todo"
    | "in_progress"
    | "completed"
    | "deleted";

  // 一括削除関連
  const { 
    handleBulkDelete, 
    DeleteModal,
    currentDisplayCount,
  } = useTasksBulkDelete({
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
    isRestoreModalOpen,
  } = useTasksBulkRestore({
    checkedDeletedTasks,
    setCheckedDeletedTasks,
    deletedTasks,
    onDeletedTaskRestore: handleItemDeselect,
    restoreButtonRef,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
  });

  // 削除後の次選択処理
  const selectNextDeletedTask = useNextDeletedItemSelection({
    deletedItems: deletedTasks || null,
    onSelectDeletedItem: onSelectDeletedTask,
    onDeselectOnly: () => onSelectDeletedTask(null),
    setScreenMode: (mode: string) => setTaskScreenMode(mode as TaskScreenMode),
    editorSelector: '[data-task-editor]',
  });

  // 削除済みタスクの復元時の次のタスク選択ハンドラー
  const handleDeletedTaskRestoreAndSelectNext = (deletedTask: DeletedTask) => {
    if (!deletedTasks) return;
    createDeletedNextSelectionHandler(deletedTasks, deletedTask, onSelectDeletedTask,
      () => onSelectDeletedTask(null), setTaskScreenMode, { isRestore: true, onSelectWithFromFlag: true });
  };

  // 通常タスクでの次のタスク選択ハンドラー（実際の画面表示順序に基づく）
  const handleTaskDeleteAndSelectNext = (
    deletedTask: Task,
    preDeleteDisplayOrder?: number[]
  ) => {
    console.log("🎯 handleTaskDeleteAndSelectNext開始:", {
      deletedTaskId: deletedTask.id,
      deletedTaskStatus: deletedTask.status,
      activeTab,
      tasksLength: tasks?.length,
    });

    if (!tasks) return;

    // 削除されたタスクが現在のタブと異なるステータスの場合は右パネルを閉じるだけ
    if (deletedTask.status !== activeTab) {
      console.log("🎯 ステータス不一致、パネルを閉じる");
      setTaskScreenMode("list");
      onClearSelection?.(); // 選択状態のみクリア
      return;
    }

    // 削除されたタスクを除外してフィルター
    const filteredTasks = tasks.filter(
      (t) => t.status === activeTab && t.id !== deletedTask.id
    );
    console.log("🎯 フィルター後のタスク:", {
      filteredTasksLength: filteredTasks.length,
      filteredTaskIds: filteredTasks.map((t) => t.id),
      deletedTaskId: deletedTask.id,
      excludedDeletedTask: true,
    });

    // 削除前のDOM順序を使用、なければ現在の順序
    const displayOrder = preDeleteDisplayOrder || getTaskDisplayOrder();
    console.log("🎯 DOM表示順序:", {
      displayOrder,
      deletedTaskId: deletedTask.id,
      usePreDelete: !!preDeleteDisplayOrder,
    });

    // DOMベースで次のタスクを直接選択
    const deletedTaskIndex = displayOrder.indexOf(deletedTask.id);
    console.log("🎯 削除されたタスクのDOM位置:", {
      deletedTaskIndex,
      deletedTaskId: deletedTask.id,
    });

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

    console.log("🎯 次のタスクID:", { nextTaskId });

    if (nextTaskId) {
      const nextTask = filteredTasks.find((t) => t.id === nextTaskId);
      console.log("🎯 次のタスクを選択:", { nextTask });

      if (nextTask) {
        // DOM監視
        setTimeout(() => {
          const editorElement = document.querySelector("[data-task-editor]");
          const titleInput = editorElement?.querySelector(
            'input[placeholder="タスクタイトルを入力..."]'
          ) as HTMLInputElement;
          const textarea = editorElement?.querySelector(
            "textarea"
          ) as HTMLTextAreaElement;

          console.log("🎯 エディターDOM監視:", {
            editorExists: !!editorElement,
            titleValue: titleInput?.value || "なし",
            textareaValue: textarea?.value || "なし",
            editorVisibility: editorElement
              ? getComputedStyle(editorElement).visibility
              : "なし",
          });
        }, 100);

        onSelectTask(nextTask, true);
        setTaskScreenMode("view");
      } else {
        console.log("🎯 次のタスクが見つからない、リストモードに戻る");
        setTaskScreenMode("list");
        onClearSelection?.(); // ホームに戻らずに選択状態だけクリア
      }
    } else {
      console.log("🎯 次のタスクIDが見つからない、リストモードに戻る");
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

  return (
    <div className="flex h-full bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${taskScreenMode === "list" ? "w-full" : "w-[44%]"} ${taskScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <DesktopUpper
          currentMode="task"
          activeTab={activeTabTyped}
          onTabChange={handleTabChange(useTabChange({
            setActiveTab,
            setScreenMode: (mode: string) => {
              setTaskScreenMode(mode as TaskScreenMode);
              onClearSelection?.(); // 選択状態もクリア
            }
          }))}
          onCreateNew={handleCreateNew}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={taskScreenMode === "list" ? "hidden" : "view"}
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          sortOptions={getVisibleSortOptions(activeTab)}
          onSortChange={setSortOptions}
          showEditDate={showEditDate}
          onShowEditDateChange={setShowEditDate}
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
          tasks={tasks || []}
          deletedTasks={deletedTasks || []}
          selectedTask={selectedTask}
          selectedDeletedTask={selectedDeletedTask}
          checkedTasks={checkedTasks}
          checkedDeletedTasks={checkedDeletedTasks}
          onToggleCheckTask={createToggleHandlerWithTabClear(
            checkedTasks,
            setCheckedTasks,
            [setCheckedDeletedTasks]
          )}
          onToggleCheckDeletedTask={createToggleHandlerWithTabClear(
            checkedDeletedTasks,
            setCheckedDeletedTasks,
            [setCheckedTasks]
          )}
          onSelectTask={handleSelectTask}
          onSelectDeletedTask={handleSelectDeletedTask}
        />

        {/* 一括操作ボタン */}
        <BulkActionButtons
          showDeleteButton={getDeleteButtonVisibility({
            activeTab,
            deletedTabName: "deleted",
            checkedItems: checkedTasks,
            checkedDeletedItems: checkedDeletedTasks,
            isRestoreModalOpen,
            isRestoreLidOpen,
            isRestoring,
            showDeleteButton,
          })}
          deleteButtonCount={currentDisplayCount}
          onDelete={handleBulkDelete}
          deleteButtonRef={deleteButtonRef}
          isDeleting={isLidOpen}
          deleteVariant={activeTab === "deleted" ? "danger" : undefined}
          showRestoreButton={activeTab === "deleted" && (checkedDeletedTasks.size > 0 || (isRestoring && currentRestoreDisplayCount > 0))}
          restoreCount={checkedDeletedTasks.size}
          onRestore={handleBulkRestore}
          restoreButtonRef={restoreButtonRef}
          isRestoring={isRestoreLidOpen}
          animatedRestoreCount={currentRestoreDisplayCount}
          useAnimatedRestoreCount={true}
          // アニメーション付きカウンター（タスク側で実装済み）
          animatedDeleteCount={currentDisplayCount}
          useAnimatedDeleteCount={true}
        />
      </div>

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={taskScreenMode !== "list"}
        onClose={handleRightPanelClose}
      >
        {taskScreenMode === "create" && (
          <TaskEditor task={null} onClose={() => setTaskScreenMode("list")} />
        )}
        {taskScreenMode === "view" && selectedTask && (
          <TaskEditor
            task={selectedTask}
            onClose={() => setTaskScreenMode("list")}
            onSelectTask={onSelectTask}
            onClosePanel={() => setTaskScreenMode("list")}
            onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
          />
        )}
        {taskScreenMode === "view" && selectedDeletedTask && (
          <>
            <DeletedTaskViewer
              ref={deletedTaskViewerRef}
              task={selectedDeletedTask}
              onClose={() => setTaskScreenMode("list")}
              onDeleteAndSelectNext={selectNextDeletedTask}
              onRestoreAndSelectNext={handleDeletedTaskRestoreAndSelectNext}
              isLidOpen={isLidOpen}
              onDeleteClick={() => {
                // 削除済タスクの削除処理
                if (selectedDeletedTask) {
                  // 1. 蓋を開く
                  setIsLidOpen(true);
                  setTimeout(() => {
                    // 2. 削除確認モーダルを表示
                    deletedTaskViewerRef.current?.showDeleteConfirmation();
                  }, 200);
                }
              }}
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
          />
        )}
      </RightPanel>

      {/* 一括削除確認モーダル */}
      <DeleteModal />

      {/* 一括復元確認モーダル */}
      <RestoreModal />
    </div>
  );
}

export default TaskScreen;
