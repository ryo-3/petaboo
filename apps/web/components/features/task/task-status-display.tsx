'use client';

import TaskCard from '@/components/features/task/task-card';
import TaskListItem from '@/components/features/task/task-list-item';
import ItemGrid from '@/components/ui/layout/item-grid';
import EmptyState from '@/components/ui/feedback/empty-state';
import type { Task } from '@/src/types/task';

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
  selectedTaskId
}: TaskStatusDisplayProps) {
  const getFilteredTasks = () => {
    if (!tasks) return [];
    const filtered = tasks.filter(task => task.status === activeTab);
    
    // 優先度順でソート（high > medium > low）
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

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

  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    return <EmptyState message={getEmptyMessage()} />;
  }

  return (
    <ItemGrid viewMode={viewMode} effectiveColumnCount={effectiveColumnCount}>
      {filteredTasks.map((task: Task) => {
        const Component = viewMode === 'card' ? TaskCard : TaskListItem;
        return (
          <Component
            key={task.id}
            task={task}
            isChecked={checkedTasks?.has(task.id) || false}
            onToggleCheck={() => onToggleCheck?.(task.id)}
            onSelect={() => {
              if (selectionMode === "check") {
                onToggleCheck?.(task.id);
              } else {
                onSelectTask?.(task);
              }
            }}
            variant="normal"
            isSelected={selectedTaskId === task.id}
          />
        );
      })}
    </ItemGrid>
  );
}

export default TaskStatusDisplay;