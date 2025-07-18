import type { DeletedTask, Task } from "@/src/types/task";
import { formatDateOnly } from "@/src/utils/formatDate";
import {
  getPriorityColor,
  getPriorityText,
  getStatusColor,
  getStatusText,
} from "@/src/utils/taskUtils";

interface TaskCardContentProps {
  task: Task | DeletedTask;
  variant?: "normal" | "deleted";
  showEditDate?: boolean;
}

function TaskCardContent({
  task,
  variant = "normal",
  showEditDate = false,
}: TaskCardContentProps) {
  const isDeleted = variant === "deleted";
  const deletedTask = task as DeletedTask;

  return (
    <>
      <div
        className={`font-semibold text-base mb-2 truncate leading-tight ${
          isDeleted ? "text-gray-700" : "text-gray-800"
        }`}
      >
        {task.title.replace(/[\r\n]/g, " ").trim()}
      </div>

      {/* ステータスと優先度 */}
      <div className="flex gap-1 mb-2">
        <span
          className={`px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}
        >
          {getStatusText(task.status)}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}
        >
          {getPriorityText(task.priority)}
        </span>
      </div>

      {/* 期限表示 一時的にコメントアウト */}
      {/* {task.dueDate && !isDeleted && (
        <div className="text-xs text-gray-500 mb-2">
          期限: {formatDateOnly(task.dueDate)}
        </div>
      )} */}

      <div className="text-sm text-gray-600 flex-1 overflow-hidden mb-2">
        <div className="line-clamp-3 break-words">
          {(task.description || "説明なし").replace(/[\r\n]/g, " ").trim()}
        </div>
      </div>

      <div
        className={`text-xs pt-2 ${
          isDeleted
            ? "text-red-400 border-t border-red-200"
            : "text-gray-400 border-t border-gray-100"
        }`}
      >
        {isDeleted ? (
          <div>削除: {formatDateOnly(deletedTask.deletedAt)}</div>
        ) : showEditDate ? (
          <div className="flex gap-2">
            <div>作成: {formatDateOnly(task.createdAt)}</div>
            {task.updatedAt && task.updatedAt !== task.createdAt && (
              <div>編集: {formatDateOnly(task.updatedAt)}</div>
            )}
          </div>
        ) : (
          <div>
            {task.updatedAt && task.updatedAt !== task.createdAt
              ? formatDateOnly(task.updatedAt)
              : formatDateOnly(task.createdAt)}
          </div>
        )}
      </div>
    </>
  );
}

export default TaskCardContent;
