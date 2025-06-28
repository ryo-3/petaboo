'use client'

import TrashIcon from '@/components/icons/trash-icon'
import RestoreIcon from '@/components/icons/restore-icon'
import MemoDateInfo from '@/components/memo-date-info'
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal'
import { usePermanentDeleteNote, useRestoreNote } from '@/src/hooks/use-notes'
import { useState } from 'react'
import type { DeletedMemo } from '@/src/types/memo'
import { formatDate } from '@/src/utils/formatDate'

interface DeletedMemoViewerProps {
  memo: DeletedMemo
  onClose: () => void
}

function DeletedMemoViewer({ memo, onClose }: DeletedMemoViewerProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const permanentDeleteNote = usePermanentDeleteNote()
  const restoreNote = useRestoreNote()

  const handlePermanentDelete = async () => {
    try {
      await permanentDeleteNote.mutateAsync(memo.id)
      setShowDeleteModal(false)
      onClose() // 完全削除後に閉じる
    } catch (error) {
      console.error('完全削除に失敗しました:', error)
    }
  }

  const handleRestore = async () => {
    try {
      await restoreNote.mutateAsync(memo.id)
      onClose() // 復元後に閉じる
    } catch (error) {
      console.error('復元に失敗しました:', error)
      alert('復元に失敗しました。')
    }
  }

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-start items-center mb-4">
        <button
          onClick={handleRestore}
          className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors"
          title="メモを復元"
        >
          <RestoreIcon className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowDeleteModal(true)}
          className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <MemoDateInfo memo={memo} />
        
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
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handlePermanentDelete}
        title="完全削除の確認"
        message={`「${memo.title}」を完全に削除しますか？この操作は取り消すことができません。`}
        confirmText="完全削除"
        isLoading={permanentDeleteNote.isPending}
        variant="danger"
      />
    </div>
  )
}

export default DeletedMemoViewer