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
  showEditDate?: boolean;
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority";
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
  sortOptions = []
}: TaskStatusDisplayProps) {
  const getFilteredTasks = () => {
    if (!tasks) return [];
    const filtered = tasks.filter(task => task.status === activeTab);
    
    // 有効な並び替えオプションを取得
    const enabledSorts = sortOptions.filter(opt => opt.enabled);
    
    if (enabledSorts.length === 0) {
      // デフォルトは優先度 > 更新日 > 作成日順
      const sorted = filtered.sort((a, b) => {
        // 1. 優先度で比較（高>中>低）
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // 2. 更新日で比較（新しい順）
        const aUpdated = a.updatedAt || a.createdAt;
        const bUpdated = b.updatedAt || b.createdAt;
        const updatedDiff = bUpdated - aUpdated;
        if (updatedDiff !== 0) return updatedDiff;
        
        // 3. 作成日で比較（新しい順）
        return b.createdAt - a.createdAt;
      });
      
      // タスクのDOM表示順序ログ
      console.log('📋 タスク表示順序 (デフォルトソート):', {
        activeTab,
        タスク数: sorted.length,
        表示順序: sorted.map((task, index) => ({
          DOM位置: index + 1,
          id: task.id,
          title: task.title.substring(0, 20) + (task.title.length > 20 ? '...' : ''),
          priority: task.priority,
          作成日: new Date(task.createdAt * 1000).toLocaleString(),
          更新日: task.updatedAt ? new Date(task.updatedAt * 1000).toLocaleString() : 'なし'
        }))
      });
      
      // 選択されたタスクのハイライト
      if (selectedTaskId) {
        const selectedIndex = sorted.findIndex(task => task.id === selectedTaskId);
        console.log(`🎯 選択中のタスク位置:`, { 
          taskId: selectedTaskId, 
          DOM位置: selectedIndex + 1,
          全体数: sorted.length 
        });
      }
      
      return sorted;
    }
    
    const customSorted = filtered.sort((a, b) => {
      // 有効な並び替えを順番に適用
      for (const sortOption of enabledSorts) {
        let diff = 0;
        
        switch (sortOption.id) {
          case "priority": {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            diff = priorityOrder[b.priority] - priorityOrder[a.priority];
            // 昇順の場合は逆にする
            if (sortOption.direction === "asc") diff = -diff;
            break;
          }
            
          case "createdAt":
            diff = b.createdAt - a.createdAt;
            // 昇順の場合は逆にする
            if (sortOption.direction === "asc") diff = -diff;
            break;
            
          case "updatedAt": {
            // updatedAtがない場合はcreatedAtを使用
            const aUpdated = a.updatedAt || a.createdAt;
            const bUpdated = b.updatedAt || b.createdAt;
            diff = bUpdated - aUpdated;
            // 昇順の場合は逆にする
            if (sortOption.direction === "asc") diff = -diff;
            break;
          }
            
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
      
      // ユーザーが明示的に選択した並び替えでは、追加のフォールバックなし
      return 0;
    });
    
    // カスタムソートのログ
    console.log('📋 タスク表示順序 (カスタムソート):', {
      activeTab,
      有効ソート: enabledSorts.map(s => `${s.label}(${s.direction})`),
      タスク数: customSorted.length,
      表示順序: customSorted.map((task, index) => ({
        DOM位置: index + 1,
        id: task.id,
        title: task.title.substring(0, 20) + (task.title.length > 20 ? '...' : ''),
        priority: task.priority,
        作成日: new Date(task.createdAt * 1000).toLocaleString(),
        更新日: task.updatedAt ? new Date(task.updatedAt * 1000).toLocaleString() : 'なし'
      }))
    });
    
    return customSorted;
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
            showEditDate={showEditDate}
          />
        );
      })}
    </ItemGrid>
  );
}

export default TaskStatusDisplay;