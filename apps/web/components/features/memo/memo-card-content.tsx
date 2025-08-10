import { formatDateOnly } from '@/src/utils/formatDate'
import type { Memo, DeletedMemo } from '@/src/types/memo'
import type { Tag } from '@/src/types/tag'
import type { Board } from '@/src/types/board'
import { TAG_COLORS } from '@/src/constants/colors'

interface MemoCardContentProps {
  memo: Memo | DeletedMemo
  variant?: 'normal' | 'deleted'
  isSelected?: boolean
  showEditDate?: boolean
  showBoardName?: boolean
  showTags?: boolean
  selectedBoardIds?: number[]
  
  // 全データ事前取得（ちらつき解消）
  preloadedTags?: Tag[]
  preloadedBoards?: Board[]
}

function MemoCardContent({ 
  memo, 
  variant = 'normal', 
  showEditDate = false, 
  showBoardName = false, 
  showTags = false,
  preloadedTags = [],
  preloadedBoards = []
}: MemoCardContentProps) {
  const isDeleted = variant === 'deleted'
  const deletedMemo = memo as DeletedMemo
  
  // 事前取得されたデータを使用（APIコール不要）
  const boards = preloadedBoards;
  const tags = preloadedTags;
  
  const { displayTitle, displayContent, lastEditTime } = {
    displayTitle: memo.title,
    displayContent: memo.content || '',
    lastEditTime: null,
  }

  return (
    <>
      <div className={`font-semibold text-base mb-1 truncate leading-tight ${
        isDeleted ? 'text-gray-700' : 'text-gray-800'
      }`}>
        {displayTitle}
      </div>
      
      {/* ボード名表示 */}
      {showBoardName && boards && boards.length > 0 && (
        <div className="mb-2">
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
        </div>
      )}
      
      {/* タグ表示 */}
      {(() => {
        if (isDeleted && showTags) {
        }
        return null;
      })()}
      {showTags && tags && tags.length > 0 && (
        <div className="mb-2">
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
        </div>
      )}
      
      <div className="text-sm text-gray-600 flex-1 overflow-hidden">
        <div className="line-clamp-4 break-words">
          {displayContent ? displayContent.split('\n').slice(1).join('\n') : ''}
        </div>
      </div>
      <div className={`text-xs pt-2 ${
        isDeleted 
          ? 'text-red-400 border-t border-red-200' 
          : 'text-gray-400 border-t border-gray-100 flex gap-2'
      }`}>
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