'use client'

import TrashIcon from '@/components/icons/trash-icon'
import RestoreIcon from '@/components/icons/restore-icon'
import DateInfo from '@/components/shared/date-info'
import Tooltip from '@/components/ui/base/tooltip'
import { ConfirmationModal } from '@/components/ui/modals'
import { useDeletedMemoActions } from './use-deleted-memo-actions'
import type { DeletedMemo, Memo } from '@/src/types/memo'
import { formatDate } from '@/src/utils/formatDate'

interface DeletedMemoViewerProps {
  memo: DeletedMemo
  onClose: () => void
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void
  onMemoRestore?: (memo: Memo) => void
}

function DeletedMemoViewer({ memo, onClose, onDeleteAndSelectNext, onMemoRestore }: DeletedMemoViewerProps) {
  const {
    handlePermanentDelete,
    handleRestore,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    showDeleteModal,
    isDeleting,
    isRestoring
  } = useDeletedMemoActions({ memo, onClose, onDeleteAndSelectNext, onMemoRestore })

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-start items-center mb-4">
        <Tooltip text="メモを復元" position="bottom">
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            {isRestoring ? (
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <RestoreIcon className="w-4 h-4" />
            )}
          </button>
        </Tooltip>
        <div className="flex-1" />
        <button
          onClick={showDeleteConfirmation}
          disabled={isDeleting}
          className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors disabled:opacity-50"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <DateInfo item={memo} />
        
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-800">{memo.title}</h1>
          <div className="text-sm text-gray-500 mt-2">
            <p className="text-red-500">削除日時: {formatDate(memo.deletedAt)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {memo.content ? (
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed opacity-75">
              {memo.content}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              内容がありません
            </div>
          )}
        </div>

        <div className="text-center py-4 bg-red-50 rounded border border-red-200">
          <p className="text-red-600 text-sm font-medium">
            このメモは削除済みです
          </p>
          <p className="text-red-500 text-xs mt-1">
            右下のゴミ箱ボタンで完全削除できます
          </p>
        </div>
      </div>

      {/* 削除確認モーダル */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={hideDeleteConfirmation}
        onConfirm={handlePermanentDelete}
        title="完全削除の確認"
        message={`「${memo.title}」を完全に削除しますか？\nこの操作は取り消すことができません。`}
        confirmText="完全削除"
        isLoading={isDeleting}
        variant="danger"
        icon="trash"
      />
    </div>
  )
}

export default DeletedMemoViewer