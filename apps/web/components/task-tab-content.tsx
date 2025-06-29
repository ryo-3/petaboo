'use client';

import TaskCard from '@/components/ui/task-card';
import TaskListItem from '@/components/ui/task-list-item';
import ItemGrid from '@/components/ui/item-grid';
import EmptyState from '@/components/ui/empty-state';
import type { Task } from '@/src/types/task';

interface TaskTabContentProps {
  activeTab: 'todo' | 'in_progress' | 'completed';
  tasks: Task[] | undefined;
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  checkedTasks: Set<number>;
  onToggleCheck: (taskId: number) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId?: number;
}

function TaskTabContent({
  activeTab,
  tasks,
  viewMode,
  effectiveColumnCount,
  checkedTasks,
  onToggleCheck,
  onSelectTask,
  selectedTaskId
}: TaskTabContentProps) {
  const getFilteredTasks = () => {
    if (!tasks) return [];
    return tasks.filter(task => task.status === activeTab);
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
            isChecked={checkedTasks.has(task.id)}
            onToggleCheck={() => onToggleCheck(task.id)}
            onSelect={() => onSelectTask(task)}
            variant="normal"
            isSelected={selectedTaskId === task.id}
          />
        );
      })}
    </ItemGrid>
  );
}

export default TaskTabContent;