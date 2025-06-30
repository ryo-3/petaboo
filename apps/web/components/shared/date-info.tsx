'use client'

import type { Memo } from '@/src/types/memo'
import type { Task } from '@/src/types/task'
import { formatDate } from '@/src/utils/formatDate'
import { useState, useEffect } from 'react'

interface DateInfoProps {
  item?: Memo | Task | null
  createdItemId?: number | null
  isEditing?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DateInfo({ item, createdItemId, isEditing = false }: DateInfoProps) {
  const [localEditTime, setLocalEditTime] = useState<number | null>(null)
  // Removed unused variable: isLocallyEdited

  useEffect(() => {
    if (!item) return

    const updateLocalEditTime = () => {
      const localData = localStorage.getItem(`memo_draft_${item.id}`)
      if (localData) {
        try {
          const parsed = JSON.parse(localData)
          if (parsed.id === item.id && parsed.lastEditedAt) {
            setLocalEditTime(parsed.lastEditedAt)
          } else {
            setLocalEditTime(null)
          }
        } catch {
          setLocalEditTime(null)
        }
      } else {
        setLocalEditTime(null)
      }
    }

    updateLocalEditTime()

    // 編集中のメモのみリアルタイム更新
    if (!isEditing) return

    const interval = setInterval(updateLocalEditTime, 1000)
    return () => clearInterval(interval)
  }, [item, isEditing])

  if (!item) {
    return null
  }

  // 最新の編集時間を決定（ローカル編集時間 vs API更新時間）
  const latestEditTime = localEditTime && localEditTime > (item.updatedAt || 0) 
    ? localEditTime 
    : item.updatedAt

  return (
    <div className="text-sm text-gray-500 mb-4 pb-2 border-b border-gray-100">
      <div className="flex gap-4">
        <span>作成 {formatDate(item.createdAt)}</span>
        {(latestEditTime && latestEditTime !== item.createdAt) && (
          <span>
            編集 {formatDate(latestEditTime)}
          </span>
        )}
      </div>
    </div>
  )
}

export default DateInfo