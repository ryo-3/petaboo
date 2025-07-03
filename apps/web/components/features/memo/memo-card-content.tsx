import { formatDateOnly } from '@/src/utils/formatDate'
import type { Memo, DeletedMemo } from '@/src/types/memo'
import { useLocalStorageSync } from '@/src/hooks/use-local-storage-sync'

interface MemoCardContentProps {
  memo: Memo | DeletedMemo
  variant?: 'normal' | 'deleted'
  isSelected?: boolean
  showEditDate?: boolean
}

function MemoCardContent({ memo, variant = 'normal', isSelected = false, showEditDate = false }: MemoCardContentProps) {
  const isDeleted = variant === 'deleted'
  const deletedMemo = memo as DeletedMemo
  
  // ローカルストレージから最新の内容を取得（リアルタイム同期）
  // Always call the hook but conditionally use its results
  const localSync = useLocalStorageSync(memo.id, memo.title, memo.content || '', isSelected)
  
  // 削除済みメモの場合のみlocalStorageを使用せず、元のデータを表示
  // 新規作成メモ（ID: 負の値）の場合もlocalStorageSyncを使用する
  const { displayTitle, displayContent, lastEditTime } = isDeleted
    ? { displayTitle: memo.title, displayContent: memo.content || '', lastEditTime: null }
    : localSync

  return (
    <>
      <div className={`font-semibold text-base mb-2 line-clamp-2 leading-tight ${
        isDeleted ? 'text-gray-700' : 'text-gray-800'
      }`}>
        {displayTitle}
      </div>
      <div className="text-sm text-gray-600 flex-1 overflow-hidden mb-2 min-h-[4rem]">
        <div className="line-clamp-3">
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
                return <div>更新: {formatDateOnly(memo.updatedAt)}</div>;
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
              const latestTime = lastEditTime && lastEditTime > (memo.updatedAt || 0)
                ? lastEditTime
                : (memo.updatedAt && memo.updatedAt !== memo.createdAt ? memo.updatedAt : memo.createdAt);
              return formatDateOnly(latestTime);
            })()}
          </div>
        )}
      </div>
    </>
  )
}

export default MemoCardContent