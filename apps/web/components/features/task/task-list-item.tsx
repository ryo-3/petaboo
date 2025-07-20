import type { DeletedTask, Task } from "@/src/types/task";
import { formatDateOnly } from "@/src/utils/formatDate";
import {
  getPriorityColor,
  getPriorityText,
  getStatusColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { useItemBoards } from '@/src/hooks/use-boards';

interface TaskListItemProps {
  task: Task | DeletedTask;
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  variant?: "normal" | "deleted";
  isSelected?: boolean;
  showEditDate?: boolean;
  showBoardName?: boolean;
  isDeleting?: boolean;
}

function TaskListItem({
  task,
  isChecked,
  onToggleCheck,
  onSelect,
  variant = "normal",
  isSelected = false,
  showEditDate = false,
  showBoardName = false,
  isDeleting = false,
}: TaskListItemProps) {
  const isDeleted = variant === "deleted";
  const deletedTask = task as DeletedTask;

  // ボード名を取得（showBoardNameがtrueの場合のみ）
  const { data: boards } = useItemBoards('task', showBoardName ? task.id : undefined);
  
  // デバッグログ：ボード名表示条件をチェック
  console.log('🔍 TaskListItem 表示条件:', {
    taskId: task.id,
    taskTitle: task.title.substring(0, 30),
    showBoardName,
    boardsData: boards,
    boardsLength: boards?.length || 0,
    willShowBoards: !!(showBoardName && boards && boards.length > 0)
  });

  return (
    <div
      data-task-id={task.id}
      className={`${
        isSelected
          ? "bg-gray-100"
          : isDeleted
            ? "bg-red-50 border-red-200 hover:bg-red-100"
            : "bg-white hover:bg-gray-50"
      } border-b border-gray-200 transition-all duration-300 ${isDeleting ? "opacity-0" : "opacity-100"}`}
    >
      <div className="p-2 flex items-center gap-3 h-full">
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

        <button onClick={onSelect} className="flex-1 text-left min-w-0">
          <div className="flex flex-col items-start h-full min-w-0">
            <div className="flex-1 min-w-0 w-full">
              <h3
                className={`font-semibold text-sm mb-1 truncate w-full ${
                  isDeleted ? "text-gray-700" : "text-gray-800"
                }`}
              >
                {task.title.replace(/[\r\n]/g, " ").trim()}
              </h3>

              {/* ボード名表示 */}
              {showBoardName && boards && boards.length > 0 && (
                <div className="mb-1">
                  <div className="flex flex-wrap gap-1">
                    {boards.map((board) => (
                      <span
                        key={board.id}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-light-Blue text-white"
                      >
                        {board.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ステータスと優先度 */}
              <div className="flex gap-1 mb-1 flex-wrap">
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

              <p className="text-xs text-gray-600 line-clamp-1 break-all">
                {task.description || ""}
              </p>

              {/* 期限表示  一時的にコメントアウト*/}
              {/* {task.dueDate && !isDeleted && (
                <div className="text-xs text-gray-500 mt-1">
                  期限: {formatDateOnly(task.dueDate)}
                </div>
              )} */}
            </div>

            <div
              className={`text-xs pt-2 ${
                isDeleted ? "text-red-400" : "text-gray-400"
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
                <div className="">
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
