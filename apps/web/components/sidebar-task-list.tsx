'use client'

import PenIcon from "@/components/icons/pen-icon";
import TrashIcon from "@/components/icons/trash-icon";
import Tooltip from '@/components/ui/tooltip';
import LoadingState from '@/components/ui/loading-state';
import ErrorState from '@/components/ui/error-state';
import EmptyState from '@/components/ui/empty-state';
import { useTasks, useDeleteTask } from '@/src/hooks/use-tasks';
import type { Task } from "@/src/types/task";
import { formatDateOnly } from "@/src/utils/formatDate";
import { getStatusColorForText, getStatusText, getPriorityIndicator } from '@/src/utils/taskUtils';

interface SidebarTaskListProps {
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  selectedTaskId?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SidebarTaskList({ onSelectTask, onEditTask, onDeleteTask, selectedTaskId }: SidebarTaskListProps) {
  const { data: tasks, isLoading, error } = useTasks()
  const deleteTask = useDeleteTask()

  const handleDelete = async (task: Task) => {
    try {
      await deleteTask.mutateAsync(task.id)
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }


  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState />;
  }

  if (!tasks || tasks.length === 0) {
    return <EmptyState message="タスクがありません" variant="simple" />;
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <ul className="space-y-1 pb-8">
        {tasks.map((task: Task) => (
        <li key={task.id}>
          <div className={`relative flex p-2 rounded transition-colors group ${
            selectedTaskId === task.id 
              ? 'bg-Green/10 hover:bg-Green/20' 
              : 'hover:bg-gray-100'
          }`}>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectTask(task)}>
              <div className="font-medium text-sm text-gray-800 truncate mb-1 flex items-center gap-1">
                <span className="text-xs">{getPriorityIndicator(task.priority)}</span>
                {task.title}
              </div>
              <div className="text-xs text-gray-500 truncate mb-1">
                {task.description || '説明なし'}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={getStatusColorForText(task.status)}>
                  {getStatusText(task.status)}
                </span>
                <span className="text-gray-400">
                  {task.updatedAt && task.updatedAt !== task.createdAt 
                    ? formatDateOnly(task.updatedAt)
                    : formatDateOnly(task.createdAt)
                  }
                </span>
              </div>
              {task.dueDate && (
                <div className="text-xs text-orange-500 mt-1">
                  期限: {formatDateOnly(task.dueDate)}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 ml-2 flex flex-col justify-between self-stretch opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip text="編集" position="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                  className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
                >
                  <PenIcon className="w-3 h-3" />
                </button>
              </Tooltip>
              <Tooltip text="削除" position="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(task);
                  }}
                  className="flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded self-end"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </Tooltip>
            </div>
          </div>
        </li>
        ))}
      </ul>
    </div>
  )
}

export default SidebarTaskList;