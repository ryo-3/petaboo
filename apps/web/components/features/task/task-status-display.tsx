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
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority";
    label: string;
    enabled: boolean;
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
  sortOptions = []
}: TaskStatusDisplayProps) {
  const getFilteredTasks = () => {
    if (!tasks) return [];
    const filtered = tasks.filter(task => task.status === activeTab);
    
    // 有効な並び替えオプションを取得
    const enabledSorts = sortOptions.filter(opt => opt.enabled);
    
    if (enabledSorts.length === 0) {
      // デフォルトは作成日順（新しい順）
      return filtered.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    return filtered.sort((a, b) => {
      // 有効な並び替えを順番に適用
      for (const sortOption of enabledSorts) {
        let diff = 0;
        
        switch (sortOption.id) {
          case "priority":
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            diff = priorityOrder[b.priority] - priorityOrder[a.priority];
            break;
            
          case "createdAt":
            diff = b.createdAt - a.createdAt;
            break;
            
          case "updatedAt":
            // updatedAtがない場合はcreatedAtを使用
            const aUpdated = a.updatedAt || a.createdAt;
            const bUpdated = b.updatedAt || b.createdAt;
            diff = bUpdated - aUpdated;
            break;
            
          case "dueDate":
            // dueDateがない場合は最後に配置
            if (!a.dueDate && !b.dueDate) diff = 0;
            else if (!a.dueDate) diff = 1;
            else if (!b.dueDate) diff = -1;
            else {
              // 期限日が近い順（昇順）
              const aDate = new Date(a.dueDate).getTime();
              const bDate = new Date(b.dueDate).getTime();
              diff = aDate - bDate;
            }
            break;
        }
        
        // 差がある場合はその結果を返す
        if (diff !== 0) return diff;
      }
      
      // すべての条件で同じ場合は作成日順
      return b.createdAt - a.createdAt;
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