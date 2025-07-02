'use client'

import type { Memo, DeletedMemo } from '@/src/types/memo'
import type { Task, DeletedTask } from '@/src/types/task'
import { formatDate } from '@/src/utils/formatDate'

interface DateInfoProps {
  item?: Memo | Task | DeletedMemo | DeletedTask | null
  createdItemId?: number | null
  isEditing?: boolean
  lastEditedAt?: number | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DateInfo({ item, createdItemId, isEditing = false, lastEditedAt }: DateInfoProps) {
  // ローカルストレージの使用を停止し、propsから受け取った値を使用
  // const [localEditTime, setLocalEditTime] = useState<number | null>(null)
  // Removed localStorage-based edit time tracking

  if (!item) {
    return null
  }

  // 最新の編集時間を決定（propsの編集時間 vs API更新時間）
  const latestEditTime = lastEditedAt && lastEditedAt > (item.updatedAt || 0) 
    ? lastEditedAt 
    : item.updatedAt

  // 新規作成時または実際に編集されていない場合は編集時間を表示しない
  const showEditTime = !createdItemId && latestEditTime && latestEditTime !== item.createdAt && item.updatedAt !== item.createdAt

  return (
    <div className="text-sm text-gray-500 mb-4 pb-2 border-b border-gray-100">
      <div className="flex gap-4">
        <span>作成 {formatDate(item.createdAt)}</span>
        {showEditTime && (
          <span>
            編集 {formatDate(latestEditTime)}
          </span>
        )}
      </div>
    </div>
  )
}

export default DateInfo