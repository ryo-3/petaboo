'use client'

import type { Memo } from '@/src/types/memo'
import { formatDate } from '@/src/utils/formatDate'

interface MemoDateInfoProps {
  memo?: Memo | null
  createdMemoId?: number | null
}

function MemoDateInfo({ memo, createdMemoId }: MemoDateInfoProps) {
  // 編集モードの場合のみ表示
  if (!memo) {
    return null
  }

  return (
    <div className="text-sm text-gray-500 mb-4 pb-2 border-b border-gray-100">
      <div className="flex gap-4">
        <span>作成 {formatDate(memo.createdAt)}</span>
        {memo.updatedAt && memo.updatedAt !== memo.createdAt && (
          <span>編集 {formatDate(memo.updatedAt)}</span>
        )}
      </div>
    </div>
  )
}

export default MemoDateInfo