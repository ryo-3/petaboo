'use client'

import TrashIcon from '@/components/icons/trash-icon'
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal'
import { usePermanentDeleteNote } from '@/src/hooks/use-notes'
import { useState } from 'react'

interface DeletedMemoViewerProps {
  memo: {
    id: number
    originalId: number
    title: string
    content: string | null
    createdAt: number
    deletedAt: number
  }
  onClose: () => void
}

function DeletedMemoViewer({ memo, onClose }: DeletedMemoViewerProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const permanentDeleteNote = usePermanentDeleteNote()

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePermanentDelete = async () => {
    try {
      await permanentDeleteNote.mutateAsync(memo.id)
      setShowDeleteModal(false)
      onClose() // 完全削除後に閉じる
    } catch (error) {
      console.error('完全削除に失敗しました:', error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-end items-center mb-4">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-800">{memo.title}</h1>
          <div className="text-sm text-gray-500 mt-2 space-y-1">
            <p>作成日時: {formatDate(memo.createdAt)}</p>
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