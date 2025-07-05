'use client'

import TrashIcon from '@/components/icons/trash-icon'
import DateInfo from '@/components/shared/date-info'
import { SingleDeleteConfirmation } from '@/components/ui/modals'
import RestoreButton from '@/components/ui/buttons/restore-button'
import { useDeletedTaskActions } from './use-deleted-task-actions'
import type { DeletedTask } from '@/src/types/task'
import { formatDate } from '@/src/utils/formatDate'

interface DeletedTaskViewerProps {
  task: DeletedTask
  onClose: () => void
  onDeleteAndSelectNext?: (deletedTask: DeletedTask, preDeleteDisplayOrder?: number[]) => void
  onRestoreAndSelectNext?: (deletedTask: DeletedTask) => void
}

function DeletedTaskViewer({ task, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext }: DeletedTaskViewerProps) {
  const {
    handlePermanentDelete,
    handleRestore,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    showDeleteModal,
    isDeleting,
    isRestoring
  } = useDeletedTaskActions({ task, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext })

  const statusOptions = [
    { value: "todo", label: "未着手", color: "bg-gray-100 text-gray-800" },
    { value: "in_progress", label: "進行中", color: "bg-blue-100 text-blue-800" },
    { value: "completed", label: "完了", color: "bg-green-100 text-green-800" },
  ]

  const priorityOptions = [
    { value: "low", label: "低", color: "bg-green-100 text-green-800" },
    { value: "medium", label: "中", color: "bg-yellow-100 text-yellow-800" },
    { value: "high", label: "高", color: "bg-red-100 text-red-800" },
  ]

  return (
    <div data-task-editor className="flex flex-col h-full bg-white">
      <div className="flex justify-start items-center mb-4">
        <RestoreButton
          onRestore={handleRestore}
          isRestoring={isRestoring}
        />
        <div className="flex-1" />
        <button
          onClick={showDeleteConfirmation}
          disabled={isDeleting}
          className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors disabled:opacity-50"
          data-right-panel-trash
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <DateInfo item={task} />
        
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-800">{task.title}</h1>
          <div className="text-sm text-gray-500 mt-2">
            <p className="text-red-500">削除日時: {formatDate(task.deletedAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                statusOptions.find(opt => opt.value === task.status)?.color
              }`}
            >
              {statusOptions.find(opt => opt.value === task.status)?.label}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                priorityOptions.find(opt => opt.value === task.priority)?.color
              }`}
            >
              {priorityOptions.find(opt => opt.value === task.priority)?.label}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              期限日
            </label>
            <span className="text-gray-700">
              {task.dueDate
                ? new Date(task.dueDate * 1000).toLocaleDateString("ja-JP")
                : "設定なし"}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            説明
          </label>
          <div className="w-full min-h-32 p-3 bg-gray-50 rounded-lg text-gray-700 leading-relaxed opacity-75">
            {task.description || "説明なし"}
          </div>
        </div>

        <div className="text-center py-4 bg-red-50 rounded border border-red-200">
          <p className="text-red-600 text-sm font-medium">
            このタスクは削除済みです
          </p>
          <p className="text-red-500 text-xs mt-1">
            右下のゴミ箱ボタンで完全削除できます
          </p>
        </div>
      </div>

      {/* 削除確認モーダル */}
      <SingleDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={hideDeleteConfirmation}
        onConfirm={handlePermanentDelete}
        itemTitle={task.title}
        itemType="task"
        deleteType="permanent"
        isLoading={isDeleting}
      />
    </div>
  )
}

export default DeletedTaskViewer