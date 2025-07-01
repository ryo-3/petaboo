"use client";

import TaskCreator from "@/components/features/task/task-creator";
import TaskEditor from "@/components/features/task/task-editor";
import DeletedTaskViewer from "@/components/features/task/deleted-task-viewer";
import DesktopUpper from "@/components/layout/desktop-upper";
import DesktopLower from "@/components/layout/desktop-lower";
import DeleteButton from "@/components/ui/buttons/delete-button";
import RightPanel from "@/components/ui/layout/right-panel";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import { useTasksBulkDelete } from "@/components/features/task/use-task-bulk-delete";
import { useDeletedTasks, useTasks } from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedTask, Task } from "@/src/types/task";
import { useEffect, useState } from "react";
import { getTaskDisplayOrder, getNextItemAfterDeletion } from "@/src/utils/domUtils";
import { createToggleHandler } from "@/src/utils/toggleUtils";

type TaskScreenMode = 'list' | 'view' | 'create' | 'edit';

interface TaskScreenProps {
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
  onSelectTask: (task: Task | null, fromFullList?: boolean) => void;
  onSelectDeletedTask: (task: DeletedTask, fromFullList?: boolean) => void;
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
  const [taskScreenMode, setTaskScreenMode] = useState<TaskScreenMode>('list');
  const [activeTab, setActiveTab] = useState<"todo" | "in_progress" | "completed" | "deleted">("todo");
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [columnCount, setColumnCount] = useState(2);
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [checkedDeletedTasks, setCheckedDeletedTasks] = useState<Set<number>>(new Set());

  // データ取得
  const { data: tasks, isLoading: taskLoading, error: taskError } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();
  const { preferences } = useUserPreferences(1);

  // 一括削除関連
  const { handleBulkDelete, bulkDeleteState } = useTasksBulkDelete({
    activeTab,
    checkedTasks,
    checkedDeletedTasks,
    setCheckedTasks,
    setCheckedDeletedTasks,
    tasks,
    deletedTasks
  });

  // 設定値が変更されたらローカル状態を更新
  useEffect(() => {
    if (preferences) {
      const newViewMode = preferences.taskViewMode || "list";
      const newColumnCount = preferences.taskColumnCount || 2;
      setViewMode(newViewMode);
      setColumnCount(newColumnCount);
    }
  }, [preferences]);

  // タスクが選択されている場合は表示モードに
  useEffect(() => {
    if (selectedTask && taskScreenMode === 'list') {
      setTaskScreenMode('view');
    }
    if (selectedDeletedTask && taskScreenMode === 'list') {
      setTaskScreenMode('view');
    }
  }, [selectedTask, selectedDeletedTask, taskScreenMode]);

  // 削除済みタスクでの次のタスク選択ハンドラー
  const handleDeletedTaskAndSelectNext = (deletedTask: DeletedTask) => {
    if (!deletedTasks) return;
    
    const sortedDeletedTasks = [...deletedTasks].sort((a, b) => b.deletedAt - a.deletedAt);
    const deletedIndex = sortedDeletedTasks.findIndex((t) => t.id === deletedTask.id);
    let nextTask: DeletedTask | null = null;

    if (deletedIndex !== -1) {
      // 削除されたタスクの次のタスクを選択
      if (deletedIndex < sortedDeletedTasks.length - 1) {
        nextTask = sortedDeletedTasks[deletedIndex + 1] || null;
      }
      // 最後のタスクが削除された場合は前のタスクを選択
      else if (deletedIndex > 0) {
        nextTask = sortedDeletedTasks[deletedIndex - 1] || null;
      }
    }

    if (nextTask) {
      // 次のタスクを選択してビューモードに切り替え
      onSelectDeletedTask(nextTask, true);
      setTaskScreenMode('view');
    } else {
      // 次のタスクが見つからない - リストモードに戻る
      setTaskScreenMode('list');
      onClose();
    }
  };

  // 通常タスクでの次のタスク選択ハンドラー（実際の画面表示順序に基づく）
  const handleTaskDeleteAndSelectNext = (deletedTask: Task) => {
    if (!tasks) return;
    
    // 現在のタブのタスクをフィルタリング
    const filteredTasks = tasks.filter((t) => t.status === activeTab);
    
    // DOM表示順序を取得して次のタスクを決定
    const displayOrder = getTaskDisplayOrder();
    const nextTask = getNextItemAfterDeletion(filteredTasks, deletedTask, displayOrder);

    if (nextTask) {
      // 次のタスクを選択してビューモードに切り替え
      onSelectTask(nextTask, true);
      setTaskScreenMode('view');
    } else {
      // 次のタスクが見つからない - リストモードに戻る
      setTaskScreenMode('list');
      onClose();
    }
  };

  // 右側パネル表示時は列数を調整
  const effectiveColumnCount =
    taskScreenMode !== "list"
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示エリア */}
      <div className={`${taskScreenMode === 'list' ? 'w-full' : 'w-1/2'} ${taskScreenMode !== 'list' ? 'border-r border-gray-300' : ''} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}>
        
        <DesktopUpper
          currentMode="task"
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "todo" | "in_progress" | "completed" | "deleted")}
          onCreateNew={() => setTaskScreenMode('create')}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          rightPanelMode={taskScreenMode === 'list' ? 'hidden' : 'view'}
          normalCount={0} // タスクでは使わない
          deletedTasksCount={deletedTasks?.length || 0}
          todoCount={tasks?.filter((task) => task.status === "todo").length || 0}
          inProgressCount={tasks?.filter((task) => task.status === "in_progress").length || 0}
          completedCount={tasks?.filter((task) => task.status === "completed").length || 0}
        />

        <DesktopLower
          currentMode="task"
          activeTab={activeTab}
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
          onToggleCheckDeletedTask={createToggleHandler(checkedDeletedTasks, setCheckedDeletedTasks)}
          onSelectTask={(task) => {
            onSelectTask(task, true);
            setTaskScreenMode('view');
          }}
          onSelectDeletedTask={(task) => {
            onSelectDeletedTask(task, true);
            setTaskScreenMode('view');
          }}
        />

        {/* 一括削除ボタン */}
        {(() => {
          const shouldShow = 
            (activeTab !== "deleted" && checkedTasks.size > 0) ||
            (activeTab === "deleted" && checkedDeletedTasks.size > 0);
          return shouldShow;
        })() && (
          <DeleteButton
            onDelete={handleBulkDelete}
            className="absolute bottom-6 right-6 z-10"
            count={
              activeTab === "deleted"
                ? checkedDeletedTasks.size
                : checkedTasks.size
            }
          />
        )}
      </div>

      {/* 右側：詳細表示エリア */}
      <RightPanel
        isOpen={taskScreenMode !== 'list'}
        onClose={() => {
          setTaskScreenMode('list');
          onClearSelection?.(); // 選択状態のみクリア（画面は変更しない）
        }}
      >
        {taskScreenMode === 'create' && (
          <TaskCreator onClose={() => setTaskScreenMode('list')} />
        )}
        {taskScreenMode === 'view' && selectedTask && (
          <TaskEditor
            task={selectedTask}
            onClose={() => setTaskScreenMode('list')}
            onSelectTask={onSelectTask}
            onClosePanel={() => setTaskScreenMode('list')}
            onDeleteAndSelectNext={handleTaskDeleteAndSelectNext}
          />
        )}
        {taskScreenMode === 'view' && selectedDeletedTask && (
          <DeletedTaskViewer
            task={selectedDeletedTask}
            onClose={() => setTaskScreenMode('list')}
            onDeleteAndSelectNext={handleDeletedTaskAndSelectNext}
          />
        )}
        {taskScreenMode === 'edit' && selectedTask && (
          <TaskEditor
            task={selectedTask}
            onClose={() => setTaskScreenMode('view')}
            onSelectTask={onSelectTask}
            onClosePanel={() => setTaskScreenMode('list')}
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