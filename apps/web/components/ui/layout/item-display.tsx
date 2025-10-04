import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Tag } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { formatDateOnly } from "@/src/utils/formatDate";
import {
  getPriorityColor,
  getPriorityText,
  getStatusColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { TAG_COLORS } from "@/src/constants/colors";
import BoardChips from "@/components/ui/chips/board-chips";
import CreatorAvatar from "@/components/shared/creator-avatar";

type Item = Memo | DeletedMemo | Task | DeletedTask;

interface ItemDisplayProps {
  itemType: "memo" | "task";
  item: Item;
  viewMode: "card" | "list";
  variant?: "normal" | "deleted";
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  onDoubleClick?: () => void;
  isSelected?: boolean;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  isDeleting?: boolean;
  selectionMode?: "select" | "check";

  // 全データ事前取得（ちらつき解消）
  preloadedTags?: Tag[];
  preloadedBoards?: Board[];

  // チーム機能
  teamMode?: boolean;
}

function ItemDisplay({
  itemType,
  item,
  viewMode,
  variant = "normal",
  isChecked,
  onToggleCheck,
  onSelect,
  onDoubleClick,
  isSelected = false,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  isDeleting = false,
  selectionMode = "select",
  preloadedTags = [],
  preloadedBoards = [],
  teamMode = false,
}: ItemDisplayProps) {
  const isDeleted = variant === "deleted";
  const isMemo = itemType === "memo";
  const isTask = itemType === "task";

  // 型安全なアクセス
  const memo = isMemo ? (item as Memo | DeletedMemo) : null;
  const task = isTask ? (item as Task | DeletedTask) : null;
  const deletedItem = isDeleted ? (item as DeletedMemo | DeletedTask) : null;

  // 共通データ
  const boards = preloadedBoards;
  const tags = preloadedTags;
  const title = item.title;

  // メモ特有データ
  const memoContent = memo?.content || "";
  const displayContent = memoContent
    ? memoContent.split("\n").slice(1).join("\n")
    : "";

  // タスク特有データ
  const taskDescription = task?.description || "";

  // 日付計算（メモ用）
  const lastEditTime = null; // 既存ロジックでは使用していない

  // スタイル定義
  const containerClass = `
    ${viewMode === "card" ? "px-3 pb-2 pt-1.5 rounded-lg relative" : ""}
    ${
      isSelected
        ? "bg-gray-100"
        : isDeleted
          ? "bg-red-50 border-red-200 hover:bg-red-100"
          : "bg-white hover:bg-gray-50"
    }
    ${viewMode === "list" ? "border-b border-gray-200" : "border border-gray-300"}
    ${isDeleting ? "opacity-0" : "opacity-100"}
  `;

  const contentWrapperClass =
    viewMode === "card"
      ? "flex flex-col h-full min-h-[140px]"
      : "p-2 flex items-center gap-3 h-28";

  return (
    <div
      data-memo-id={isMemo ? item.id : undefined}
      data-task-id={isTask ? item.id : undefined}
      className={containerClass}
    >
      <div className={contentWrapperClass}>
        {/* チェックボックス（リストモード） */}
        {viewMode === "list" && selectionMode === "check" && (
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
        )}

        {/* チェックボックス（カードモード） */}
        {viewMode === "card" && selectionMode === "check" && (
          <div className="absolute top-2 left-2 z-10">
            <button
              onClick={onToggleCheck}
              className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isChecked
                  ? isDeleted
                    ? "bg-white border-gray-400"
                    : "bg-Green border-Green"
                  : "bg-white border-gray-300 hover:border-gray-400"
              }`}
            >
              {isChecked && (
                <svg
                  className={`w-3 h-3 ${isDeleted ? "text-black" : "text-white"}`}
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
          </div>
        )}

        {/* メインコンテンツ */}
        <button
          onClick={onSelect}
          onDoubleClick={onDoubleClick}
          className={`${viewMode === "list" ? "flex-1 min-w-0 text-left" : "flex-1 flex flex-col text-left"}`}
        >
          {/* タイトル部分 */}
          <div
            className={
              viewMode === "list"
                ? "flex flex-col gap-2"
                : "flex flex-col flex-1"
            }
          >
            <div
              className={`flex items-center gap-2 min-w-0 ${viewMode === "card" && selectionMode === "check" ? "pl-6" : ""}`}
            >
              <h3
                className={`font-semibold ${viewMode === "card" ? "text-base mb-1" : "text-sm mb-[2px]"} truncate flex-1 ${
                  isDeleted ? "text-gray-700" : "text-gray-800"
                }`}
              >
                {isTask ? title.replace(/[\r\n]/g, " ").trim() : title}
              </h3>

              {/* 作成者アイコン（メモ・カード表示・チームモードのみ） */}
              {isMemo && viewMode === "card" && teamMode && (
                <CreatorAvatar
                  createdBy={item.createdBy}
                  avatarColor={item.avatarColor}
                  teamMode={teamMode}
                  size="md"
                  className="flex-shrink-0"
                />
              )}
            </div>

            {/* タスク：ステータスと優先度 */}
            {isTask && task && (
              <div
                className={`flex gap-1 ${viewMode === "card" ? "mb-2" : "mb-1"} flex-wrap`}
              >
                <span
                  className={`px-${viewMode === "card" ? "2" : "1.5"} py-0.5 rounded text-xs ${getStatusColor(task.status)}`}
                >
                  {getStatusText(task.status)}
                </span>
                <span
                  className={`px-${viewMode === "card" ? "2" : "1.5"} py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}
                >
                  {getPriorityText(task.priority)}
                </span>
              </div>
            )}

            {/* ボード名・タグ表示 */}
            {((showBoardName && boards && boards.length > 0) ||
              (showTags && tags && tags.length > 0)) && (
              <div className="mb-1 flex items-center gap-2">
                {/* ボード名 */}
                {showBoardName && boards && boards.length > 0 && (
                  <>
                    {viewMode === "list" ? (
                      <BoardChips
                        boards={boards}
                        variant="compact"
                        maxWidth="100px"
                        interactive={false}
                        maxDisplay={2}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {boards.map((board) => (
                          <span
                            key={board.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-light-Blue text-white"
                          >
                            {board.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* タグ表示 */}
                {showTags && tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`inline-flex items-center px-${viewMode === "card" ? "2" : "1.5"} py-0.5 rounded-full text-xs font-medium`}
                        style={{
                          backgroundColor: tag.color || TAG_COLORS.background,
                          color: TAG_COLORS.text,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* コンテンツ */}
            {isMemo && (
              <p
                className={`text-xs text-gray-600 ${viewMode === "list" ? "line-clamp-3 min-h-[2rem]" : "line-clamp-4"}`}
              >
                {displayContent}
              </p>
            )}

            {isTask && (
              <p
                className={`text-${viewMode === "card" ? "sm" : "xs"} text-gray-600 ${viewMode === "list" ? "line-clamp-1 break-all" : "line-clamp-3 break-words flex-1 overflow-hidden mb-2"}`}
              >
                {taskDescription.replace(/[\r\n]/g, " ").trim()}
              </p>
            )}

            {/* 日付表示 */}
            <div
              className={`text-xs text-right ${viewMode === "card" ? "pt-2 mt-auto" : ""} ${
                isDeleted
                  ? "text-red-400"
                  : viewMode === "card"
                    ? "text-gray-400 border-t border-gray-100"
                    : "text-gray-400"
              } ${viewMode === "card" && isDeleted ? "border-t border-red-200" : ""}`}
            >
              {isDeleted && deletedItem ? (
                showEditDate ? (
                  <div className="flex gap-2 justify-end">
                    <div>作成: {formatDateOnly(item.createdAt)}</div>
                    {item.updatedAt && item.updatedAt !== item.createdAt && (
                      <div>編集: {formatDateOnly(item.updatedAt)}</div>
                    )}
                    <div>削除: {formatDateOnly(deletedItem.deletedAt)}</div>
                  </div>
                ) : (
                  <div>削除: {formatDateOnly(deletedItem.deletedAt)}</div>
                )
              ) : showEditDate ? (
                <div className="flex gap-2 justify-end">
                  <div>作成: {formatDateOnly(item.createdAt)}</div>
                  {(() => {
                    // 新規作成アイテムの場合
                    if (item.id < 0) {
                      const updateTime = item.updatedAt || item.createdAt;
                      if (updateTime !== item.createdAt) {
                        return <div>編集: {formatDateOnly(updateTime)}</div>;
                      }
                      return null;
                    }

                    // ローカル編集時間またはAPI更新時間を表示
                    const hasLocalEdit =
                      lastEditTime && lastEditTime > (item.updatedAt || 0);
                    const hasApiUpdate =
                      item.updatedAt && item.updatedAt !== item.createdAt;

                    if (hasLocalEdit) {
                      return <div>編集: {formatDateOnly(lastEditTime)}</div>;
                    } else if (hasApiUpdate) {
                      return <div>編集: {formatDateOnly(item.updatedAt!)}</div>;
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <div>
                  {(() => {
                    // 新規作成アイテムの場合
                    if (item.id < 0) {
                      return formatDateOnly(item.updatedAt || item.createdAt);
                    }

                    // ローカル編集時間とAPI更新時間のうち最新のものを表示
                    const latestTime =
                      lastEditTime && lastEditTime > (item.updatedAt || 0)
                        ? lastEditTime
                        : item.updatedAt && item.updatedAt !== item.createdAt
                          ? item.updatedAt
                          : item.createdAt;
                    return formatDateOnly(latestTime);
                  })()}
                </div>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default ItemDisplay;
