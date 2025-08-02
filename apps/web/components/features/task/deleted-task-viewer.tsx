"use client";

import TrashIcon from "@/components/icons/trash-icon";
import DateInfo from "@/components/shared/date-info";
import Tooltip from "@/components/ui/base/tooltip";
import RestoreButton from "@/components/ui/buttons/restore-button";
import { SingleDeleteConfirmation } from "@/components/ui/modals";
import { useItemBoards } from "@/src/hooks/use-boards";
import type { DeletedTask } from "@/src/types/task";
import { formatDate } from "@/src/utils/formatDate";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useDeletedTaskActions } from "./use-deleted-task-actions";

interface DeletedTaskViewerProps {
  task: DeletedTask;
  onClose: () => void;
  onDeleteAndSelectNext?: (
    deletedTask: DeletedTask,
    preDeleteDisplayOrder?: number[]
  ) => void;
  onRestoreAndSelectNext?: (deletedTask: DeletedTask) => void;
  isLidOpen?: boolean;
  onDeleteClick?: () => void;
}

export interface DeletedTaskViewerRef {
  showDeleteConfirmation: () => void;
  isDeleting: boolean;
  showDeleteModal: boolean;
}

const DeletedTaskViewer = forwardRef<
  DeletedTaskViewerRef,
  DeletedTaskViewerProps
>(
  (
    {
      task,
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
    } = useDeletedTaskActions({
      task,
      onClose,
      onDeleteAndSelectNext,
      onRestoreAndSelectNext,
    });

    // ボード情報を取得
    const { data: boards = [] } = useItemBoards('task', Number(task.originalId));

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

    const statusOptions = [
      { value: "todo", label: "未着手", color: "bg-gray-100 text-gray-800" },
      {
        value: "in_progress",
        label: "進行中",
        color: "bg-blue-100 text-blue-800",
      },
      {
        value: "completed",
        label: "完了",
        color: "bg-green-100 text-green-800",
      },
    ];

    const priorityOptions = [
      { value: "low", label: "低", color: "bg-green-100 text-green-800" },
      { value: "medium", label: "中", color: "bg-yellow-100 text-yellow-800" },
      { value: "high", label: "高", color: "bg-red-100 text-red-800" },
    ];

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
          data-task-editor
          className="flex flex-col h-full bg-white relative"
        >
          <DateInfo item={task} />
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
                削除日時: {formatDate(task.deletedAt)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm ${
                    statusOptions.find((opt) => opt.value === task.status)
                      ?.color
                  }`}
                >
                  {
                    statusOptions.find((opt) => opt.value === task.status)
                      ?.label
                  }
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  優先度
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm ${
                    priorityOptions.find((opt) => opt.value === task.priority)
                      ?.color
                  }`}
                >
                  {
                    priorityOptions.find((opt) => opt.value === task.priority)
                      ?.label
                  }
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

            {/* ボード情報 */}
            {boards.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属ボード
                </label>
                <div className="flex flex-wrap gap-1">
                  {boards.map((board) => (
                    <span
                      key={board.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-light-Blue text-white"
                    >
                      {board.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="w-full min-h-32 leading-relaxed whitespace-pre-wrap mb-8">
              {task.description || ""}
            </div>
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
          position="right-panel"
        />
      </>
    );
  }
);

DeletedTaskViewer.displayName = "DeletedTaskViewer";

export default DeletedTaskViewer;
