'use client'

import { useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import DateInfo from '@/components/shared/date-info'
import { ConfirmationModal } from '@/components/ui/modals'
import RestoreButton from '@/components/ui/buttons/restore-button'
import TrashIcon from '@/components/icons/trash-icon'
import Tooltip from '@/components/ui/base/tooltip'
import { useDeletedMemoActions } from './use-deleted-memo-actions'
import type { DeletedMemo } from '@/src/types/memo'
import { formatDate } from '@/src/utils/formatDate'

interface DeletedMemoViewerProps {
  memo: DeletedMemo
  onClose: () => void
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void
  isLidOpen?: boolean
  onDeleteClick?: () => void
}

export interface DeletedMemoViewerRef {
  showDeleteConfirmation: () => void
  isDeleting: boolean
  showDeleteModal: boolean
}

const DeletedMemoViewer = forwardRef<DeletedMemoViewerRef, DeletedMemoViewerProps>(
  ({ memo, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext, isLidOpen = false, onDeleteClick }, ref) => {
  const {
    handlePermanentDelete,
    handleRestore,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    showDeleteModal,
    isDeleting,
    isRestoring
  } = useDeletedMemoActions({ memo, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext })

  const [isTrashHovered, setIsTrashHovered] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // 蓋の状態を監視してアニメーション状態を管理
  useEffect(() => {
    if (isLidOpen) {
      setIsAnimating(true)
    } else if (isAnimating) {
      // 蓋が閉じた後、300ms待ってからアニメーション状態をリセット
      const timer = setTimeout(() => {
        setIsAnimating(false)
        // アニメーション完了時にホバー状態もリセット
        setIsTrashHovered(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isLidOpen, isAnimating])

  // refで外部から呼び出せるようにする
  useImperativeHandle(ref, () => ({
    showDeleteConfirmation,
    isDeleting,
    showDeleteModal
  }), [showDeleteConfirmation, isDeleting, showDeleteModal]);

  return (
    <>
      <div data-memo-editor className="flex flex-col h-full bg-white relative">
        <div className="flex justify-start items-center mb-4">
          <RestoreButton
            onRestore={handleRestore}
            isRestoring={isRestoring}
            buttonSize="size-6"
            iconSize="size-3.5"
          />
          <Tooltip text="完全削除" position="top">
            <button
              onClick={() => {
                if (onDeleteClick) {
                  onDeleteClick();
                } else {
                  showDeleteConfirmation();
                }
              }}
              onMouseEnter={() => setIsTrashHovered(true)}
              onMouseLeave={() => setIsTrashHovered(false)}
              className={`flex items-center justify-center size-6 ml-2 rounded-md transition-colors duration-200 ${
                isAnimating
                  ? "bg-red-200 text-red-600"
                  : isTrashHovered
                    ? "bg-red-200 text-red-600"
                    : "bg-red-100 text-red-600"
              }`}
            >
              <TrashIcon className="size-3.5" isLidOpen={isLidOpen} />
            </button>
          </Tooltip>
          <div className="flex-1" />
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <DateInfo item={memo} />
          
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-800">{memo.title}</h1>
            <div className="text-sm text-gray-500 mt-2">
              <p className="text-red-500">削除日時: {formatDate(memo.deletedAt)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容
            </label>
            <div className="w-full min-h-32 p-3 bg-gray-50 rounded-lg text-gray-700 leading-relaxed opacity-75">
              {memo.content ? memo.content.split('\n').slice(1).join('\n') : ""}
            </div>
          </div>

          <div className="text-center py-4 bg-red-50 rounded border border-red-200 mb-6">
            <p className="text-red-600 text-sm font-medium">
              このメモは削除済みです
            </p>
            <p className="text-red-500 text-xs mt-1">
              復元ボタンで元に戻すか、ゴミ箱ボタンで完全削除できます
            </p>
          </div>
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
        position="right-panel"
      />
    </>
  )
});

DeletedMemoViewer.displayName = 'DeletedMemoViewer';

export default DeletedMemoViewer