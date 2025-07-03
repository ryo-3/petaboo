import type { DeletedTask, Task } from "@/src/types/task";
import { formatDateOnly } from "@/src/utils/formatDate";
import { getStatusColor, getPriorityColor, getStatusText, getPriorityText } from "@/src/utils/taskUtils";

interface TaskListItemProps {
  task: Task | DeletedTask;
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  variant?: "normal" | "deleted";
  isSelected?: boolean;
  showEditDate?: boolean;
}

function TaskListItem({
  task,
  isChecked,
  onToggleCheck,
  onSelect,
  variant = "normal",
  isSelected = false,
  showEditDate = false,
}: TaskListItemProps) {
  const isDeleted = variant === "deleted";
  const deletedTask = task as DeletedTask;


  return (
    <div
      data-task-id={task.id}
      className={`${
        isSelected
          ? "bg-gray-100"
          : isDeleted
            ? "bg-red-50 border-red-200 hover:bg-red-100"
            : "bg-white hover:bg-gray-50"
      } border-b border-gray-200 transition-colors`}
    >
      <div className="p-2 flex items-center gap-3">
        <button
          onClick={onToggleCheck}
          className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isChecked
              ? isDeleted
                ? "bg-white border-gray-400"
                : "bg-Green border-Green"
              : "bg-white border-gray-300 hover:border-gray-400"
          }`}
        >
          {isChecked && (
            <svg
              className={`w-2.5 h-2.5 ${isDeleted ? "text-black" : "text-white"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <button onClick={onSelect} className="flex-1 min-w-0 text-left">
          <div className="flex items-start justify-between gap-4 flex-col">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-sm mb-1 line-clamp-1 ${
                  isDeleted ? "text-gray-700" : "text-gray-800"
                }`}
              >
                {task.title}
              </h3>

              {/* ステータスと優先度 */}
              <div className="flex gap-1 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}
                >
                  {getStatusText(task.status)}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}
                >
                  {getPriorityText(task.priority)}
                </span>
              </div>

              <p className="text-xs text-gray-600 line-clamp-1">
                {task.description || "説明なし"}
              </p>

              {/* 期限表示 */}
              {task.dueDate && !isDeleted && (
                <div className="text-xs text-gray-500 mt-1">
                  期限: {formatDateOnly(task.dueDate)}
                </div>
              )}
            </div>

            <div
              className={`text-xs flex-shrink-0 ${
                isDeleted ? "text-red-400" : "text-gray-400"
              }`}
            >
              {isDeleted ? (
                <div>削除: {formatDateOnly(deletedTask.deletedAt)}</div>
              ) : showEditDate ? (
                <div className="text-right flex gap-2">
                  <div>作成: {formatDateOnly(task.createdAt)}</div>
                  {task.updatedAt && task.updatedAt !== task.createdAt && (
                    <div>更新: {formatDateOnly(task.updatedAt)}</div>
                  )}
                </div>
              ) : (
                <div className="text-right">
                  {task.updatedAt && task.updatedAt !== task.createdAt
                    ? formatDateOnly(task.updatedAt)
                    : formatDateOnly(task.createdAt)}
                </div>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default TaskListItem;
