import type { DeletedTask, Task } from "@/src/types/task";
import { formatDateOnly } from "@/src/utils/formatDate";
import {
  getPriorityColor,
  getPriorityText,
  getStatusColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { useItemBoards } from "@/src/hooks/use-boards";
import { useItemTags } from "@/src/hooks/use-taggings";
import { TAG_COLORS } from "@/src/constants/colors";

interface TaskCardContentProps {
  task: Task | DeletedTask;
  variant?: "normal" | "deleted";
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;

  // 削除済み表示用の事前取得データ
  preloadedTags?: Array<{ id: number; name: string; color?: string }>;
  preloadedBoards?: Array<{ id: number; name: string }>;
}

function TaskCardContent({
  task,
  variant = "normal",
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  preloadedTags,
  preloadedBoards,
}: TaskCardContentProps) {
  const isDeleted = variant === "deleted";
  const deletedTask = task as DeletedTask;

  // データを取得（削除済み表示の場合はpreloadedデータを優先）
  const boardItemId =
    !isDeleted && task.id > 0
      ? (task as Task).originalId || task.id.toString()
      : "";
  const { data: boards } = useItemBoards("task", boardItemId || undefined);

  const targetOriginalId =
    !isDeleted && task.id > 0
      ? (task as Task).originalId || task.id.toString()
      : "";
  const { tags } = useItemTags("task", targetOriginalId);

  // 削除済み表示の場合はpreloadedデータを使用
  const displayTags = isDeleted ? preloadedTags : tags;
  const displayBoards = isDeleted ? preloadedBoards : boards;

  return (
    <>
      <div
        className={`font-semibold text-base mb-2 truncate leading-tight min-w-0 ${
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

      {/* ボード名・タグ表示 */}
      {((showBoardName && displayBoards && displayBoards.length > 0) ||
        (showTags && displayTags && displayTags.length > 0)) && (
        <div className="mb-2 flex flex-wrap gap-1">
          {/* ボード名 */}
          {showBoardName && displayBoards && displayBoards.length > 0 && (
            <>
              {displayBoards.map((board) => (
                <span
                  key={board.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-light-Blue text-white"
                >
                  {board.name}
                </span>
              ))}
            </>
          )}

          {/* タグ */}
          {showTags && displayTags && displayTags.length > 0 && (
            <>
              {displayTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: tag.color || TAG_COLORS.background,
                    color: TAG_COLORS.text,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </>
          )}
        </div>
      )}

      {/* 期限表示 一時的にコメントアウト */}
      {/* {task.dueDate && !isDeleted && (
        <div className="text-xs text-gray-500 mb-2">
          期限: {formatDateOnly(task.dueDate)}
        </div>
      )} */}

      <div className="text-sm text-gray-600 flex-1 overflow-hidden mb-2">
        <div className="line-clamp-3 break-words">
          {(task.description || "").replace(/[\r\n]/g, " ").trim()}
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
