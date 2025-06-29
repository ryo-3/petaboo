'use client'

import TrashIcon from '@/components/icons/trash-icon'
import TaskDateInfo from '@/components/task-date-info'
import EditButton from '@/components/ui/edit-button'
import { useDeleteTask } from '@/src/hooks/use-tasks'
import type { Task } from '@/src/types/task'

interface TaskViewerProps {
  task: Task
  onClose: () => void
  onEdit?: (task: Task) => void
  onExitEdit?: () => void
  isEditMode?: boolean
}

function TaskViewer({ task, onClose, onEdit, onExitEdit, isEditMode = false }: TaskViewerProps) {
  const deleteTask = useDeleteTask()

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id)
      onClose()
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-start items-center mb-4">
        {onEdit && (
          <EditButton
            isEditing={isEditMode}
            onEdit={() => onEdit(task)}
            onExitEdit={onExitEdit}
          />
        )}
        <button
          onClick={handleDelete}
          className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <TaskDateInfo task={task} />
        
        <div className="border-b border-gray-200 pb-2">
          <h1 className="text-lg font-medium text-gray-800">{task.title}</h1>
        </div>

        {/* ステータスと優先度 */}
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
            {getStatusText(task.status)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
            優先度: {getPriorityText(task.priority)}
          </span>
        </div>

        {/* 期限 */}
        {task.dueDate && (
          <div className="border-b border-gray-200 pb-2">
            <span className="text-sm text-gray-600">期限: </span>
            <span className="text-sm font-medium">
              {new Date(task.dueDate * 1000).toLocaleDateString('ja-JP')}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {task.description ? (
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {task.description}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              説明がありません
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskViewer