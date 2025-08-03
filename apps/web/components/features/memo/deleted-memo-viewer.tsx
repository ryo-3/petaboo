"use client";

import TrashIcon from "@/components/icons/trash-icon";
import DateInfo from "@/components/shared/date-info";
import Tooltip from "@/components/ui/base/tooltip";
import RestoreButton from "@/components/ui/buttons/restore-button";
import { ConfirmationModal } from "@/components/ui/modals";
import type { DeletedMemo } from "@/src/types/memo";
import { formatDate } from "@/src/utils/formatDate";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useDeletedMemoActions } from "./use-deleted-memo-actions";

interface DeletedMemoViewerProps {
  memo: DeletedMemo;
  onClose: () => void;
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  isLidOpen?: boolean;
  onDeleteClick?: () => void;
}

export interface DeletedMemoViewerRef {
  showDeleteConfirmation: () => void;
  isDeleting: boolean;
  showDeleteModal: boolean;
}

const DeletedMemoViewer = forwardRef<
  DeletedMemoViewerRef,
  DeletedMemoViewerProps
>(
  (
    {
      memo,
      onClose,
      onDeleteAndSelectNext,
      onRestoreAndSelectNext,
      isLidOpen = false,
      onDeleteClick,
    },
    ref
  ) => {
    const {
      handlePermanentDelete,
      handleRestore,
      showDeleteConfirmation,
      hideDeleteConfirmation,
      showDeleteModal,
      isDeleting,
      isRestoring,
    } = useDeletedMemoActions({
      memo,
      onClose,
      onDeleteAndSelectNext,
      onRestoreAndSelectNext,
    });

    const [isTrashHovered, setIsTrashHovered] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // 蓋の状態を監視してアニメーション状態を管理
    useEffect(() => {
      if (isLidOpen) {
        setIsAnimating(true);
      } else if (isAnimating) {
        // 蓋が閉じた後、300ms待ってからアニメーション状態をリセット
        const timer = setTimeout(() => {
          setIsAnimating(false);
          // アニメーション完了時にホバー状態もリセット
          setIsTrashHovered(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [isLidOpen, isAnimating]);


    // refで外部から呼び出せるようにする
    useImperativeHandle(
      ref,
      () => ({
        showDeleteConfirmation,
        isDeleting,
        showDeleteModal,
      }),
      [showDeleteConfirmation, isDeleting, showDeleteModal]
    );

    return (
      <>
        <div
          data-memo-editor
          className="flex flex-col h-full bg-white relative"
        >
          <DateInfo item={memo} />
          <div className="flex justify-start items-center">
            {/* 削除中は復元ボタンを非表示 */}
            {!isDeleting && (
              <RestoreButton
                onRestore={handleRestore}
                isRestoring={isRestoring}
                buttonSize="size-7"
                iconSize="size-4"
              />
            )}
            {/* 復元中は削除ボタンを非表示 */}
            {!isRestoring && (
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
                  className={`flex items-center justify-center size-7 ml-2 rounded-md transition-colors duration-200 ${
                    isAnimating
                      ? "bg-red-200 text-red-600"
                      : isTrashHovered
                        ? "bg-red-200 text-red-600"
                        : "bg-red-100 text-red-600"
                  }`}
                >
                  <TrashIcon className="size-5" isLidOpen={isLidOpen} />
                </button>
              </Tooltip>
            )}
            <div className="flex-1" />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="mt-2 flex gap-4 items-center">
              <h3 className="font-bold text-red-600">削除済アイテム</h3>
              <p className="text-red-500 text-sm">
                削除日時: {formatDate(memo.deletedAt)}
              </p>
            </div>

            <div className="w-full min-h-32 leading-relaxed whitespace-pre-wrap mb-8">
              {memo.content || ""}
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
    );
  }
);

DeletedMemoViewer.displayName = "DeletedMemoViewer";

export default DeletedMemoViewer;
