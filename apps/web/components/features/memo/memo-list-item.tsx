import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { Tag } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { formatDateOnly } from "@/src/utils/formatDate";
import { TAG_COLORS } from "@/src/constants/colors";

interface MemoListItemProps {
  memo: Memo | DeletedMemo;
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  variant?: "normal" | "deleted";
  isSelected?: boolean;
  showEditDate?: boolean;
  showBoardName?: boolean;
  isDeleting?: boolean;
  selectionMode?: "select" | "check";
  showTags?: boolean;
  
  // 全データ事前取得（ちらつき解消）
  preloadedTags?: Tag[];
  preloadedBoards?: Board[];
}

function MemoListItem({
  memo,
  isChecked,
  onToggleCheck,
  onSelect,
  variant = "normal",
  isSelected = false,
  showEditDate = false,
  showBoardName = false,
  isDeleting = false,
  selectionMode = "select",
  showTags = false,
  preloadedTags = [],
  preloadedBoards = [],
}: MemoListItemProps) {
  const isDeleted = variant === "deleted";
  const deletedMemo = memo as DeletedMemo;

  // 事前取得されたデータを使用（APIコール不要）
  const boards = preloadedBoards;
  const tags = preloadedTags;

  const { displayTitle, displayContent, lastEditTime } = {
    displayTitle: memo.title,
    displayContent: memo.content || "",
    lastEditTime: null,
  };

  // Removed unused variable: isLocallyEdited

  return (
    <div
      data-memo-id={memo.id}
      className={`${
        isSelected
          ? "bg-gray-100"
          : isDeleted
            ? "bg-red-50 border-red-200 hover:bg-red-100"
            : "bg-white hover:bg-gray-50"
      } border-b border-gray-200 transition-all duration-300 ${isDeleting ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="p-2 flex items-center gap-3">
        {selectionMode === "check" && (
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

        <button onClick={onSelect} className="flex-1 min-w-0 text-left">
          <div className="flex flex-col gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-sm mb-[2px] truncate ${
                  isDeleted ? "text-gray-700" : "text-gray-800"
                }`}
              >
                {displayTitle}
              </h3>
            </div>
              
            {/* ボード名・タグ表示 */}
            {((showBoardName && boards && boards.length > 0) || showTags) && (
              <div className="mb-1 flex items-center gap-2">
                {/* ボード名 */}
                {showBoardName && boards && boards.length > 0 && (
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
                )}
                
                {/* タグ表示 */}
                {showTags && tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: TAG_COLORS.background,
                          color: TAG_COLORS.text
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <p className="text-xs text-gray-600 line-clamp-3 min-h-[2rem]">
              {displayContent ? displayContent.split('\n').slice(1).join('\n') : ""}
            </p>

            <div
              className={`text-xs ${
                isDeleted ? "text-red-400" : "text-gray-400"
              }`}
            >
              {isDeleted ? (
                showEditDate ? (
                  <div className="flex gap-2">
                    <div>作成: {formatDateOnly(memo.createdAt)}</div>
                    {memo.updatedAt && memo.updatedAt !== memo.createdAt && (
                      <div>編集: {formatDateOnly(memo.updatedAt)}</div>
                    )}
                    <div>削除: {formatDateOnly(deletedMemo.deletedAt)}</div>
                  </div>
                ) : (
                  <div>削除: {formatDateOnly(deletedMemo.deletedAt)}</div>
                )
              ) : showEditDate ? (
                <div className="flex gap-2">
                  <div>作成: {formatDateOnly(memo.createdAt)}</div>
                  {(() => {
                    // 新規作成メモの場合
                    if (memo.id < 0) {
                      const updateTime = memo.updatedAt || memo.createdAt;
                      if (updateTime !== memo.createdAt) {
                        return <div>編集: {formatDateOnly(updateTime)}</div>;
                      }
                      return null;
                    }

                    // ローカル編集時間またはAPI更新時間を表示
                    const hasLocalEdit = lastEditTime && lastEditTime > (memo.updatedAt || 0);
                    const hasApiUpdate = memo.updatedAt && memo.updatedAt !== memo.createdAt;
                    
                    if (hasLocalEdit) {
                      return <div>編集: {formatDateOnly(lastEditTime)}</div>;
                    } else if (hasApiUpdate) {
                      return <div>編集: {formatDateOnly(memo.updatedAt!)}</div>;
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <div>
                  {(() => {
                    // 新規作成メモの場合
                    if (memo.id < 0) {
                      return formatDateOnly(memo.updatedAt || memo.createdAt);
                    }

                    // ローカル編集時間とAPI更新時間のうち最新のものを表示
                    const latestTime =
                      lastEditTime && lastEditTime > (memo.updatedAt || 0)
                        ? lastEditTime
                        : memo.updatedAt && memo.updatedAt !== memo.createdAt
                          ? memo.updatedAt
                          : memo.createdAt;
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

export default MemoListItem;
