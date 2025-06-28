'use client'

import TrashIcon from '@/components/icons/trash-icon'
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal'
import { useDeleteNote } from '@/src/hooks/use-notes'
import { useState } from 'react'

interface MemoViewerProps {
  memo: {
    id: number
    title: string
    content: string | null
    createdAt: number
  }
  onClose: () => void
}

function MemoViewer({ memo, onClose }: MemoViewerProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deleteNote = useDeleteNote()

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
      <div className="flex justify-end items-center mb-4">
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
          <p className="text-sm text-gray-500 mt-2">
            作成日時: {formatDate(memo.createdAt)}
          </p>
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