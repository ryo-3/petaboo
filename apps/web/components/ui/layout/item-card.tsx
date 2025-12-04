import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Tag } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import type { Attachment } from "@/src/hooks/use-attachments";
import { formatDateOnly } from "@/src/utils/formatDate";
import {
  getPriorityColor,
  getPriorityText,
  getStatusColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { TAG_COLORS } from "@/src/constants/colors";
import CreatorAvatar from "@/components/shared/creator-avatar";
import { useAuthenticatedImage } from "@/src/hooks/use-authenticated-image";
import { extractFirstLine } from "@/src/utils/html";

type Item = Memo | DeletedMemo | Task | DeletedTask;

interface ItemCardProps {
  itemType: "memo" | "task";
  item: Item;
  variant?: "normal" | "deleted";
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  onDoubleClick?: () => void;
  isSelected?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  isDeleting?: boolean;
  selectionMode?: "select" | "check";

  // 全データ事前取得（ちらつき解消）
  preloadedTags?: Tag[];
  preloadedBoards?: Board[];
  preloadedAttachments?: Attachment[];

  // チーム機能
  teamMode?: boolean;

  // 初期選択ボードID
  initialBoardId?: number;

  // ボードカテゴリー名（ボード詳細画面でのみ表示）
  boardCategoryName?: string;
}

function ItemCard({
  itemType,
  item,
  variant = "normal",
  isChecked,
  onToggleCheck,
  onSelect,
  onDoubleClick,
  isSelected = false,
  showBoardName = true,
  showTags = true,
  isDeleting = false,
  selectionMode = "select",
  preloadedTags = [],
  preloadedBoards = [],
  preloadedAttachments = [],
  teamMode = false,
  boardCategoryName,
}: ItemCardProps) {
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
  const title =
    itemType === "memo" ? extractFirstLine(memo?.content) : item.title;

  // メモ特有データ
  const memoContent = memo?.content || "";
  const displayContent = memoContent
    ? memoContent.split("\n").slice(1).join("\n")
    : "";

  // タスク特有データ
  const taskDescription = task?.description || "";

  // 担当者情報（タスクデータに含まれている）
  const hasAssignee =
    teamMode && isTask && task?.assigneeId && task?.assigneeName;

  // 日付計算（メモ用）
  const lastEditTime = null; // 既存ロジックでは使用していない

  // 画像URL取得（認証付き）
  const firstImageUrl =
    preloadedAttachments && preloadedAttachments.length > 0
      ? preloadedAttachments[0]?.url
      : undefined;

  const { blobUrl: authenticatedImageUrl } =
    useAuthenticatedImage(firstImageUrl);

  // スタイル定義
  const containerClass = `
    px-3 pb-2 pt-1.5 rounded-lg relative
    ${
      isSelected
        ? "bg-gray-100"
        : isDeleted
          ? "bg-red-50 border-red-200 hover:bg-red-100"
          : "bg-white hover:bg-gray-50"
    }
    border border-gray-300
    ${isDeleting ? "opacity-0" : "opacity-100"}
  `;

  const contentWrapperClass = "flex flex-col h-full min-h-[140px]";

  return (
    <div
      data-memo-id={isMemo ? item.id : undefined}
      data-task-id={isTask ? item.id : undefined}
      className={containerClass}
    >
      <div className={contentWrapperClass}>
        {/* チェックボックス（カード表示） */}
        {selectionMode === "check" && (
          <div className="absolute top-2 left-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleCheck();
              }}
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
          className="flex-1 flex flex-col text-left"
        >
          {/* タイトル部分 */}
          <div className="flex flex-col flex-1">
            <div
              className={`flex items-center gap-2 min-w-0 ${selectionMode === "check" ? "pl-6" : ""}`}
            >
              <h3
                className={`font-semibold text-base mb-1 flex-1 break-words line-clamp-2 ${
                  title === "無題"
                    ? "text-gray-400"
                    : isDeleted
                      ? "text-gray-700"
                      : "text-gray-800"
                }`}
                dangerouslySetInnerHTML={{
                  __html: isTask ? title.replace(/[\r\n]/g, " ").trim() : title,
                }}
              />
            </div>

            {/* タスク：ステータスと優先度 */}
            {isTask && task && (
              <div className="flex gap-2 mb-2 flex-wrap items-center">
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
                {/* ボードカテゴリー表示（ボード詳細画面でのみ） */}
                {boardCategoryName && (
                  <span className="text-sm text-indigo-600 font-semibold">
                    #{boardCategoryName}
                  </span>
                )}
                {/* 担当者表示（チームモードのみ） */}
                {teamMode && hasAssignee && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600">担当者：</span>
                    <CreatorAvatar
                      createdBy={task.assigneeName}
                      avatarColor={task.assigneeAvatarColor}
                      teamMode={teamMode}
                      size="sm"
                    />
                    <span className="text-xs text-gray-600">
                      {task.assigneeName}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ボード名・タグ表示 */}
            {((showBoardName && boards && boards.length > 0) ||
              (showTags && tags && tags.length > 0)) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {showBoardName && boards && boards.length > 0 && (
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

                {showTags && tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
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
                  </div>
                )}
              </div>
            )}

            {/* コンテンツ */}
            {isMemo && (
              <div
                className="text-xs text-gray-600 line-clamp-4"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            )}

            {isTask && (
              <div
                className="text-sm text-gray-600 line-clamp-3 break-words flex-1 overflow-hidden mb-2"
                dangerouslySetInnerHTML={{
                  __html: taskDescription.replace(/[\r\n]/g, " ").trim(),
                }}
              />
            )}

            {/* コメント数表示 */}
            {item.commentCount !== undefined && item.commentCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>{item.commentCount}</span>
              </div>
            )}

            {/* 画像サムネイル表示 */}
            {preloadedAttachments &&
              preloadedAttachments.length > 0 &&
              preloadedAttachments[0] &&
              authenticatedImageUrl && (
                <div className="mt-2 mb-2">
                  <div className="relative inline-block">
                    <img
                      src={authenticatedImageUrl}
                      alt={preloadedAttachments[0].fileName}
                      className="w-32 h-32 object-cover rounded border border-gray-200"
                      loading="lazy"
                    />
                    {preloadedAttachments.length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded">
                        +{preloadedAttachments.length - 1}
                      </span>
                    )}
                  </div>
                </div>
              )}

            {/* 日付表示 */}
            <div
              className={`text-xs text-right pt-2 mt-auto ${
                isDeleted
                  ? "text-red-400 border-t border-red-200"
                  : "text-gray-400 border-t border-gray-100"
              }`}
            >
              {isDeleted && deletedItem ? (
                // 削除済み：作成日 + 削除日
                <div className="flex gap-2 justify-end items-center">
                  <div className="flex gap-1 items-center">
                    <span>作成:</span>
                    {teamMode && (
                      <CreatorAvatar
                        createdBy={item.createdBy}
                        avatarColor={item.avatarColor}
                        teamMode={teamMode}
                        size="sm"
                      />
                    )}
                    <span>{formatDateOnly(item.createdAt)}</span>
                  </div>
                  <div>削除: {formatDateOnly(deletedItem.deletedAt)}</div>
                </div>
              ) : (
                // 通常：作成日 + 編集日（両方表示）
                <div className="flex gap-2 justify-end items-center">
                  <div className="flex gap-1 items-center">
                    <span>作成:</span>
                    {teamMode && (
                      <CreatorAvatar
                        createdBy={item.createdBy}
                        avatarColor={item.avatarColor}
                        teamMode={teamMode}
                        size="sm"
                      />
                    )}
                    <span>{formatDateOnly(item.createdAt)}</span>
                  </div>
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
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default ItemCard;
