import { formatDateOnly } from '@/src/utils/formatDate'
import type { Task, DeletedTask } from '@/src/types/task'

interface TaskCardProps {
  task: Task | DeletedTask
  isChecked: boolean
  onToggleCheck: () => void
  onSelect: () => void
  variant?: 'normal' | 'deleted'
  isSelected?: boolean
}

function TaskCard({ task, isChecked, onToggleCheck, onSelect, variant = 'normal', isSelected = false }: TaskCardProps) {
  const isDeleted = variant === 'deleted'
  const deletedTask = task as DeletedTask

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'in_progress':
        return '進行中'
      default:
        return '未着手'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      default:
        return '低'
    }
  }

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
          <div className={`font-semibold text-base mb-2 line-clamp-2 ${
            isDeleted ? 'text-gray-700' : 'text-gray-800'
          }`}>
            {task.title}
          </div>
          
          {/* ステータスと優先度 */}
          <div className="flex gap-1 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
              {getStatusText(task.status)}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
              {getPriorityText(task.priority)}
            </span>
          </div>

          {/* 期限表示 */}
          {task.dueDate && !isDeleted && (
            <div className="text-xs text-gray-500 mb-2">
              期限: {formatDateOnly(task.dueDate)}
            </div>
          )}
          
          <div className="text-sm text-gray-600 flex-1 overflow-hidden">
            <div className="line-clamp-3">
              {task.description || '説明なし'}
            </div>
          </div>
          
          <div className={`text-xs mt-2 pt-2 ${
            isDeleted 
              ? 'text-red-400 border-t border-red-200' 
              : 'text-gray-400 border-t border-gray-100'
          }`}>
            {isDeleted ? (
              <div>削除: {formatDateOnly(deletedTask.deletedAt)}</div>
            ) : (
              <div>
                {task.updatedAt && task.updatedAt !== task.createdAt
                  ? formatDateOnly(task.updatedAt)
                  : formatDateOnly(task.createdAt)
                }
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

export default TaskCard