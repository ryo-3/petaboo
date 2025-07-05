'use client'

import { useEffect, useImperativeHandle, forwardRef } from 'react'

import TrashIcon from '@/components/icons/trash-icon'
import BaseViewer from '@/components/shared/base-viewer'
import { ConfirmationModal } from '@/components/ui/modals'
import RestoreButton from '@/components/ui/buttons/restore-button'
import { useDeletedMemoActions } from './use-deleted-memo-actions'
import type { DeletedMemo } from '@/src/types/memo'
import { formatDate } from '@/src/utils/formatDate'

interface DeletedMemoViewerProps {
  memo: DeletedMemo
  onClose: () => void
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void
  onShowDeleteConfirmation?: () => void
}

export interface DeletedMemoViewerRef {
  showDeleteConfirmation: () => void
  isDeleting: boolean
  showDeleteModal: boolean
}

const DeletedMemoViewer = forwardRef<DeletedMemoViewerRef, DeletedMemoViewerProps>(
  ({ memo, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext, onShowDeleteConfirmation }, ref) => {
  const {
    handlePermanentDelete,
    handleRestore,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    showDeleteModal,
    isDeleting,
    isRestoring
  } = useDeletedMemoActions({ memo, onClose, onDeleteAndSelectNext, onRestoreAndSelectNext })

  // refで外部から呼び出せるようにする
  useImperativeHandle(ref, () => ({
    showDeleteConfirmation,
    isDeleting,
    showDeleteModal
  }), [showDeleteConfirmation, isDeleting, showDeleteModal]);

  return (
    <>
      <div data-memo-editor>
        <BaseViewer
        item={memo}
        onClose={onClose}
        error={null}
        isEditing={false}
        createdItemId={null}
        headerActions={
          <div className="flex items-center gap-2">
            <RestoreButton
              onRestore={handleRestore}
              isRestoring={isRestoring}
              buttonSize="size-6"
              iconSize="size-3.5"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex-1 overflow-y-auto mt-3">
            {memo.content ? (
              <div className="whitespace-pre-wrap text-gray-500 leading-relaxed opacity-75">
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
              削除日時: {formatDate(memo.deletedAt)}
            </p>
          </div>
        </div>
        </BaseViewer>
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
    </>
  )
});

DeletedMemoViewer.displayName = 'DeletedMemoViewer';

export default DeletedMemoViewer