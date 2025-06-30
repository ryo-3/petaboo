import { formatDateOnly } from '@/src/utils/formatDate'
import type { Memo, DeletedMemo } from '@/src/types/memo'
import { useLocalStorageSync } from '@/src/hooks/use-local-storage-sync'

interface MemoCardProps {
  memo: Memo | DeletedMemo
  isChecked: boolean
  onToggleCheck: () => void
  onSelect: () => void
  variant?: 'normal' | 'deleted'
  isSelected?: boolean
}

function MemoCard({ memo, isChecked, onToggleCheck, onSelect, variant = 'normal', isSelected = false }: MemoCardProps) {
  const isDeleted = variant === 'deleted'
  const deletedMemo = memo as DeletedMemo
  
  // ローカルストレージから最新の内容を取得（リアルタイム同期）
  // Always call the hook but conditionally use its results
  const localSync = useLocalStorageSync(memo.id, memo.title, memo.content || '', isSelected)
  
  // 削除済みメモや新規作成メモ（ID: 負の値）の場合はlocalStorageを使用せず、元のデータを表示
  const { displayTitle, displayContent, lastEditTime } = (isDeleted || memo.id < 0)
    ? { displayTitle: memo.title, displayContent: memo.content || '', lastEditTime: null }
    : localSync

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleCheck()
        }}
        className={`absolute top-1.5 right-1.5 size-5 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
          isChecked
            ? isDeleted 
              ? 'bg-white border-gray-400'
              : 'bg-Green border-Green'
            : 'bg-white border-gray-300 hover:border-gray-400'
        }`}
      >
        {isChecked && (
          <svg
            className={`w-3 h-3 ${isDeleted ? 'text-black' : 'text-white'}`}
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
        className={`${
          isSelected
            ? 'bg-gray-100 border border-gray-400'
            : isDeleted
            ? 'bg-red-50 border border-red-200 hover:shadow-md hover:border-red-300'
            : 'bg-white border border-gray-200 hover:shadow-md hover:border-gray-300'
        } p-4 rounded-lg transition-all text-left h-40 w-full`}
      >
        <div className="flex flex-col h-full">
          <div className={`font-semibold text-base mb-2 line-clamp-2${
            isDeleted ? 'text-gray-700' : 'text-gray-800'
          }`}>
            {displayTitle}
          </div>
          <div className="text-sm text-gray-600 flex-1 overflow-hidden">
            <div className="line-clamp-4">
              {displayContent || '内容なし'}
            </div>
          </div>
          <div className={`text-xs mt-2 pt-2 ${
            isDeleted 
              ? 'text-red-400 border-t border-red-200' 
              : 'text-gray-400 border-t border-gray-100 flex gap-2'
          }`}>
            {isDeleted ? (
              <div>削除: {formatDateOnly(deletedMemo.deletedAt)}</div>
            ) : (
              <div>
                {(() => {
                  // 新規作成メモの場合
                  if (memo.id < 0) {
                    return formatDateOnly(memo.updatedAt || memo.createdAt);
                  }
                  
                  // ローカル編集時間とAPI更新時間のうち最新のものを表示
                  const latestTime = lastEditTime && lastEditTime > (memo.updatedAt || 0)
                    ? lastEditTime
                    : (memo.updatedAt && memo.updatedAt !== memo.createdAt ? memo.updatedAt : memo.createdAt);
                  return formatDateOnly(latestTime);
                })()}
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

export default MemoCard