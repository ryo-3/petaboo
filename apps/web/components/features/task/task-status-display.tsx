'use client';

import TaskCard from '@/components/features/task/task-card';
import TaskListItem from '@/components/features/task/task-list-item';
import ItemStatusDisplay from '@/components/ui/layout/item-status-display';
import type { Task, DeletedTask } from '@/src/types/task';

interface TaskStatusDisplayProps {
  activeTab: 'todo' | 'in_progress' | 'completed';
  tasks: Task[] | undefined;
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  selectionMode?: 'select' | 'check';
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: Task) => void;
  selectedTaskId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
}

interface DeletedTaskDisplayProps {
  deletedTasks: DeletedTask[] | undefined;
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  selectionMode?: 'select' | 'check';
  checkedTasks?: Set<number>;
  onToggleCheck?: (taskId: number) => void;
  onSelectTask?: (task: DeletedTask) => void;
  selectedTaskId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
}

function TaskStatusDisplay({
  activeTab,
  tasks,
  viewMode,
  effectiveColumnCount,
  selectionMode = 'select',
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showEditDate = false,
  showBoardName = false,
  sortOptions = []
}: TaskStatusDisplayProps) {
  // デバッグ: showBoardName の受け取り状況
  console.log('🔍 TaskStatusDisplay props:', { 
    activeTab, 
    showBoardName,
    tasksLength: tasks?.length 
  });
  const filteredTasks = tasks?.filter(task => task.status === activeTab);

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'todo':
        return '未着手のタスクがありません';
      case 'in_progress':
        return '進行中のタスクがありません';
      case 'completed':
        return '完了したタスクがありません';
      default:
        return 'タスクがありません';
    }
  };

  const getSortValue = (task: Task, sortId: string): number => {
    switch (sortId) {
      case "priority": {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[task.priority] || 0;
      }
      case "createdAt":
        return task.createdAt;
      case "updatedAt":
        return task.updatedAt || task.createdAt;
      case "dueDate":
        return task.dueDate ? new Date(task.dueDate).getTime() : 0;
      default:
        return 0;
    }
  };

  const getDefaultSortValue = (task: Task): number => {
    // デフォルトは優先度 > 更新日 > 作成日順
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityValue = priorityOrder[task.priority] * 1000000000; // 優先度を大きな重みで乗算
    const timeValue = task.updatedAt || task.createdAt;
    return priorityValue + timeValue;
  };

  const renderTask = (task: Task, props: {
    isChecked: boolean;
    onToggleCheck: () => void;
    onSelect: () => void;
    isSelected: boolean;
    showEditDate: boolean;
    showBoardName?: boolean;
    variant?: 'normal' | 'deleted';
  }) => {
    const Component = viewMode === 'card' ? TaskCard : TaskListItem;
    /* eslint-disable react/prop-types */
    return (
      <Component
        key={task.id}
        task={task}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        isSelected={props.isSelected}
        showEditDate={props.showEditDate}
        showBoardName={props.showBoardName}
        variant={props.variant}
      />
    );
    /* eslint-enable react/prop-types */
  };

  return (
    <ItemStatusDisplay
      items={filteredTasks}
      viewMode={viewMode}
      effectiveColumnCount={effectiveColumnCount}
      selectionMode={selectionMode}
      checkedItems={checkedTasks}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectTask}
      selectedItemId={selectedTaskId}
      showEditDate={showEditDate}
      showBoardName={showBoardName}
      sortOptions={sortOptions}
      emptyMessage={getEmptyMessage()}
      renderItem={renderTask}
      getSortValue={getSortValue}
      getDefaultSortValue={getDefaultSortValue}
    />
  );
}

/**
 * 削除済みタスク表示コンポーネント
 */
export function DeletedTaskDisplay({
  deletedTasks,
  viewMode,
  effectiveColumnCount,
  selectionMode = 'select',
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId,
  showEditDate = false,
  showBoardName = false,
  sortOptions = []
}: DeletedTaskDisplayProps) {
  const getSortValue = (task: DeletedTask, sortId: string): number => {
    switch (sortId) {
      case "priority": {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[task.priority] || 0);
      }
      case "createdAt":
        return task.createdAt;
      case "updatedAt":
        return task.updatedAt || task.createdAt;
      case "deletedAt":
        return task.deletedAt;
      default:
        return 0;
    }
  };

  const getDefaultSortValue = (task: DeletedTask): number => {
    // デフォルトは削除日順（新しい順）
    return task.deletedAt;
  };

  const renderTask = (task: DeletedTask, props: {
    isChecked: boolean;
    onToggleCheck: () => void;
    onSelect: () => void;
    isSelected: boolean;
    showEditDate: boolean;
    showBoardName?: boolean;
    variant?: 'normal' | 'deleted';
  }) => {
    const Component = viewMode === 'card' ? TaskCard : TaskListItem;
    /* eslint-disable react/prop-types */
    return (
      <Component
        key={task.id}
        task={task}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        variant="deleted"
        isSelected={props.isSelected}
        showEditDate={props.showEditDate}
        showBoardName={props.showBoardName}
      />
    );
    /* eslint-enable react/prop-types */
  };

  return (
    <ItemStatusDisplay
      items={deletedTasks}
      viewMode={viewMode}
      effectiveColumnCount={effectiveColumnCount}
      selectionMode={selectionMode}
      checkedItems={checkedTasks}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectTask}
      selectedItemId={selectedTaskId}
      showEditDate={showEditDate}
      showBoardName={showBoardName}
      sortOptions={sortOptions}
      emptyMessage="削除済みタスクはありません"
      renderItem={renderTask}
      getSortValue={getSortValue}
      getDefaultSortValue={getDefaultSortValue}
      variant="deleted"
    />
  );
}

export default TaskStatusDisplay;