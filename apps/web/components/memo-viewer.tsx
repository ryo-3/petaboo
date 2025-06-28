'use client'

import TrashIcon from '@/components/icons/trash-icon'
import MemoIcon from '@/components/icons/memo-icon'
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal'
import { useDeleteNote } from '@/src/hooks/use-notes'
import { useState } from 'react'
import type { Memo } from '@/src/types/memo'
import { formatDate } from '@/src/utils/formatDate'

interface MemoViewerProps {
  memo: Memo
  onClose: () => void
  onEdit?: () => void
}

function MemoViewer({ memo, onClose, onEdit }: MemoViewerProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deleteNote = useDeleteNote()


  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync(memo.id)
      setShowDeleteModal(false)
      onClose() // 削除後に閉じる
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-start items-center mb-4">
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-gray-600 hover:text-gray-800 p-1 transition-colors"
          >
            <MemoIcon className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-800">{memo.title}</h1>
          <div className="text-sm text-gray-500 mt-2 flex gap-4">
            <p>作成日時: {formatDate(memo.createdAt)}</p>
            {memo.updatedAt && memo.updatedAt !== memo.createdAt && (
              <p>編集日時: {formatDate(memo.updatedAt)}</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {memo.content ? (
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {memo.content}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              内容がありません
            </div>
          )}
        </div>
      </div>

      {/* 削除確認モーダル */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="削除の確認"
        message={`「${memo.title}」を削除しますか？削除されたメモは削除済みメモ一覧から確認できます。`}
        confirmText="削除"
        isLoading={deleteNote.isPending}
        variant="warning"
      />
    </div>
  )
}

export default MemoViewer