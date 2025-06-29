'use client'

import type { Task } from '@/src/types/task'
import { formatDate } from '@/src/utils/formatDate'

interface TaskDateInfoProps {
  task?: Task | null
  createdTaskId?: number | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TaskDateInfo({ task, createdTaskId }: TaskDateInfoProps) {
  if (!task) {
    return null
  }

  return (
    <div className="text-sm text-gray-500 mb-4 pb-2 border-b border-gray-100">
      <div className="flex gap-4">
        <span>作成 {formatDate(task.createdAt)}</span>
        {task.updatedAt && task.updatedAt !== task.createdAt && (
          <span>編集 {formatDate(task.updatedAt)}</span>
        )}
      </div>
    </div>
  )
}

export default TaskDateInfo