import type { DeletedMemo, Memo } from "@/src/types/memo";
import { formatDateOnly } from "@/src/utils/formatDate";

interface MemoListItemProps {
  memo: Memo | DeletedMemo;
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  variant?: "normal" | "deleted";
  isSelected?: boolean;
  showEditDate?: boolean;
  isDeleting?: boolean;
}

function MemoListItem({
  memo,
  isChecked,
  onToggleCheck,
  onSelect,
  variant = "normal",
  isSelected = false,
  showEditDate = false,
  isDeleting = false,
}: MemoListItemProps) {
  const isDeleted = variant === "deleted";
  const deletedMemo = memo as DeletedMemo;

  // ローカルストレージ使用禁止 - 直接APIデータを使用
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
          <div className="flex flex-col gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-sm mb-1 line-clamp-1 ${
                  isDeleted ? "text-gray-700" : "text-gray-800"
                }`}
              >
                {displayTitle}
              </h3>
              <p className="text-xs text-gray-600 line-clamp-2">
                {displayContent || "内容なし"}
              </p>
            </div>

            <div
              className={`text-xs ${
                isDeleted ? "text-red-400" : "text-gray-400"
              }`}
            >
              {isDeleted ? (
                <div>削除: {formatDateOnly(deletedMemo.deletedAt)}</div>
              ) : showEditDate ? (
                <div className="flex gap-2">
                  <div>作成: {formatDateOnly(memo.createdAt)}</div>
                  {(() => {
                    // 新規作成メモの場合
                    if (memo.id < 0) {
                      const updateTime = memo.updatedAt || memo.createdAt;
                      if (updateTime !== memo.createdAt) {
                        return <div>更新: {formatDateOnly(updateTime)}</div>;
                      }
                      return null;
                    }

                    // ローカル編集時間またはAPI更新時間を表示
                    const hasLocalEdit = lastEditTime && lastEditTime > (memo.updatedAt || 0);
                    const hasApiUpdate = memo.updatedAt && memo.updatedAt !== memo.createdAt;
                    
                    if (hasLocalEdit) {
                      return <div>更新: {formatDateOnly(lastEditTime)}</div>;
                    } else if (hasApiUpdate) {
                      return <div>更新: {formatDateOnly(memo.updatedAt!)}</div>;
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
