'use client'

import type { Memo } from '@/src/types/memo'
import type { Task } from '@/src/types/task'
import { formatDate } from '@/src/utils/formatDate'

interface DateInfoProps {
  item?: Memo | Task | null
  createdItemId?: number | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DateInfo({ item, createdItemId }: DateInfoProps) {
  if (!item) {
    return null
  }

  return (
    <div className="text-sm text-gray-500 mb-4 pb-2 border-b border-gray-100">
      <div className="flex gap-4">
        <span>作成 {formatDate(item.createdAt)}</span>
        {item.updatedAt && item.updatedAt !== item.createdAt && (
          <span>編集 {formatDate(item.updatedAt)}</span>
        )}
      </div>
    </div>
  )
}

export default DateInfo