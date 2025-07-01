"use client";

import SidebarItem from "@/components/shared/sidebar-item";
import EmptyState from "@/components/ui/feedback/empty-state";
import ErrorState from "@/components/ui/feedback/error-state";
import LoadingState from "@/components/ui/feedback/loading-state";
import { useDeleteTask, useTasks } from "@/src/hooks/use-tasks";
import type { Task } from "@/src/types/task";
import { formatDateOnly } from "@/src/utils/formatDate";
import {
  getPriorityIndicator,
  getStatusColorForText,
  getStatusText,
} from "@/src/utils/taskUtils";

interface TaskListProps {
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  selectedTaskId?: number;
}

 
function TaskList({
  onSelectTask,
  onEditTask,
  selectedTaskId,
}: TaskListProps) {
  const { data: tasks, isLoading, error } = useTasks();
  const deleteTask = useDeleteTask();

  const handleDelete = async (task: Task) => {
    try {
      await deleteTask.mutateAsync(task.id);
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

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
            <SidebarItem
              isSelected={selectedTaskId === task.id}
              onSelect={() => onSelectTask(task)}
              onEdit={() => onEditTask(task)}
              onDelete={() => handleDelete(task)}
            >
              <div className="font-medium text-sm text-gray-800 truncate mb-1 flex items-center gap-1">
                <span className="text-xs">
                  {getPriorityIndicator(task.priority)}
                </span>
                {task.title}
              </div>
              <div className="text-xs text-gray-500 truncate mb-1">
                {task.description || "説明なし"}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={getStatusColorForText(task.status)}>
                  {getStatusText(task.status)}
                </span>
                <span className="text-gray-400">
                  {task.updatedAt && task.updatedAt !== task.createdAt
                    ? formatDateOnly(task.updatedAt)
                    : formatDateOnly(task.createdAt)}
                </span>
              </div>
              {task.dueDate && (
                <div className="text-xs text-orange-500 mt-1">
                  期限: {formatDateOnly(task.dueDate)}
                </div>
              )}
            </SidebarItem>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskList;
