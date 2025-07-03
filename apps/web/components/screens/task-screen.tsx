"use client";

import DeletedTaskViewer from "@/components/features/task/deleted-task-viewer";
import TaskEditor from "@/components/features/task/task-editor";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete";
import DesktopLower from "@/components/layout/desktop-lower";
import DesktopUpper from "@/components/layout/desktop-upper";
import DeleteButton from "@/components/ui/buttons/delete-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import { useScreenState } from "@/src/hooks/use-screen-state";
import { useDeletedTasks, useTasks } from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedTask, Task } from "@/src/types/task";
import {
  createDeletedNextSelectionHandler,
  createNextSelectionHandler,
  getTaskDisplayOrder,
} from "@/src/utils/domUtils";
import {
  getDeleteButtonCount,
  shouldShowDeleteButton,
} from "@/src/utils/screenUtils";
import { createToggleHandler } from "@/src/utils/toggleUtils";

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
  // データ取得
  const { data: tasks, isLoading: taskLoading, error: taskError } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();
  const { preferences } = useUserPreferences(1);

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
    {
      type: "task",
      defaultActiveTab: "todo",
      defaultColumnCount: 2,
    },
    "list" as TaskScreenMode,
    selectedTask,
    selectedDeletedTask,
    preferences || undefined
  );

  // 一括削除関連
  const { handleBulkDelete, bulkDeleteState } = useTasksBulkDelete({
    activeTab: activeTab as "todo" | "in_progress" | "completed" | "deleted",
    checkedTasks,
    checkedDeletedTasks,
    setCheckedTasks,
    setCheckedDeletedTasks,
    tasks,
    deletedTasks,
  });

  // 削除済みタスクでの次のタスク選択ハンドラー
  const handleDeletedTaskAndSelectNext = (deletedTask: DeletedTask) => {
    if (!deletedTasks) return;

    createDeletedNextSelectionHandler(
      deletedTasks,
      deletedTask,
      (task) => onSelectDeletedTask(task, true),
      onClose,
      setTaskScreenMode
    );
  };

  // 削除済みタスクの復元時の次のタスク選択ハンドラー
  const handleDeletedTaskRestoreAndSelectNext = (deletedTask: DeletedTask) => {
    if (!deletedTasks) return;

    createDeletedNextSelectionHandler(
      deletedTasks,
      deletedTask,
      (task) => onSelectDeletedTask(task, true),
      () => {
        setTaskScreenMode("list");
        onClearSelection?.();
      },
      setTaskScreenMode
    );
  };

  // 通常タスクでの次のタスク選択ハンドラー（実際の画面表示順序に基づく）
  const handleTaskDeleteAndSelectNext = (deletedTask: Task) => {
    if (!tasks) return;

    // 削除されたタスクが現在のタブと異なるステータスの場合は右パネルを閉じるだけ
    if (deletedTask.status !== activeTab) {
      setTaskScreenMode("list");
      onClearSelection?.(); // 選択状態のみクリア
      return;
    }

    const filteredTasks = tasks.filter((t) => t.status === activeTab);
    const displayOrder = getTaskDisplayOrder();

    createNextSelectionHandler(
      filteredTasks,
      deletedTask,
      displayOrder,
      (task) => onSelectTask(task, true),
      onClose,
      setTaskScreenMode
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示エリア */}
      <div
        className={`${taskScreenMode === "list" ? "w-full" : "w-1/2"} ${taskScreenMode !== "list" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-[400ms] relative`}
      >
        <DesktopUpper
          currentMode="task"
          activeTab={
            activeTab as "todo" | "in_progress" | "completed" | "deleted"
          }
          onTabChange={(tab) => {
            setActiveTab(tab);
            // タブ切り替え時に右パネルを閉じる
            setTaskScreenMode("list");
            onClearSelection?.();
          }}
          onCreateNew={() => {
            // 新規作成時に選択状態をクリア
            onSelectTask(null, true);
            onSelectDeletedTask(null, true);
            setTaskScreenMode("create");
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={taskScreenMode === "list" ? "hidden" : "view"}
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
          activeTab={
            activeTab as "todo" | "in_progress" | "completed" | "deleted"
          }
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          isLoading={taskLoading}
          error={taskError}
          tasks={tasks || []}
          deletedTasks={deletedTasks || []}
          selectedTask={selectedTask}
          selectedDeletedTask={selectedDeletedTask}
          checkedTasks={checkedTasks}
          checkedDeletedTasks={checkedDeletedTasks}
          onToggleCheckTask={createToggleHandler(checkedTasks, setCheckedTasks)}
          onToggleCheckDeletedTask={createToggleHandler(
            checkedDeletedTasks,
            setCheckedDeletedTasks
          )}
          onSelectTask={(task) => {
            onSelectTask(task, true);
            setTaskScreenMode("view");
          }}
          onSelectDeletedTask={(task) => {
            onSelectDeletedTask(task, true);
            setTaskScreenMode("view");
          }}
        />

        {/* 一括削除ボタン */}
        {shouldShowDeleteButton(
          activeTab,
          "deleted",
          checkedTasks,
          checkedDeletedTasks
        ) && (
          <DeleteButton
            onDelete={handleBulkDelete}
            className="absolute bottom-6 right-6 z-10"
            count={getDeleteButtonCount(
              activeTab,
              "deleted",
              checkedTasks,
              checkedDeletedTasks
            )}
          />
        )}
      </div>

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={taskScreenMode !== "list"}
        onClose={() => {
          setTaskScreenMode("list");
          onClearSelection?.(); // 選択状態のみクリア（画面は変更しない）
        }}
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
          <DeletedTaskViewer
            task={selectedDeletedTask}
            onClose={() => setTaskScreenMode("list")}
            onDeleteAndSelectNext={handleDeletedTaskAndSelectNext}
            onRestoreAndSelectNext={handleDeletedTaskRestoreAndSelectNext}
          />
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
      <BulkDeleteConfirmation
        isOpen={bulkDeleteState.isModalOpen}
        onClose={bulkDeleteState.handleCancel}
        onConfirm={bulkDeleteState.handleConfirm}
        count={bulkDeleteState.targetIds.length}
        itemType="task"
        deleteType={activeTab === "deleted" ? "permanent" : "normal"}
        isLoading={bulkDeleteState.isDeleting}
      />
    </div>
  );
}

export default TaskScreen;
