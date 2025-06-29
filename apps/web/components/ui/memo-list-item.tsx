import { formatDateOnly } from '@/src/utils/formatDate'
import type { Memo, DeletedMemo } from '@/src/types/memo'

interface MemoListItemProps {
  memo: Memo | DeletedMemo
  isChecked: boolean
  onToggleCheck: () => void
  onSelect: () => void
  variant?: 'normal' | 'deleted'
}

function MemoListItem({ memo, isChecked, onToggleCheck, onSelect, variant = 'normal' }: MemoListItemProps) {
  const isDeleted = variant === 'deleted'
  const deletedMemo = memo as DeletedMemo

  return (
    <div className={`${
      isDeleted
        ? 'bg-red-50 border-red-200 hover:bg-red-100'
        : 'bg-white hover:bg-gray-50'
    } border-b border-gray-200 transition-colors`}>
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={onToggleCheck}
          className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isChecked
              ? isDeleted 
                ? 'bg-white border-gray-400'
                : 'bg-Green border-Green'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }`}
        >
          {isChecked && (
            <svg
              className={`w-2.5 h-2.5 ${isDeleted ? 'text-black' : 'text-white'}`}
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

        <button
          onClick={onSelect}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-sm mb-1 truncate ${
                isDeleted ? 'text-gray-700' : 'text-gray-800'
              }`}>
                {memo.title}
              </h3>
              <p className="text-xs text-gray-600 line-clamp-2">
                {memo.content || '内容なし'}
              </p>
            </div>
            
            <div className={`text-xs flex-shrink-0 ${
              isDeleted ? 'text-red-400' : 'text-gray-400'
            }`}>
              {isDeleted ? (
                <div>削除: {formatDateOnly(deletedMemo.deletedAt)}</div>
              ) : (
                <div className="text-right">
                  {memo.updatedAt && memo.updatedAt !== memo.createdAt
                    ? formatDateOnly(memo.updatedAt)
                    : formatDateOnly(memo.createdAt)
                  }
                </div>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default MemoListItem