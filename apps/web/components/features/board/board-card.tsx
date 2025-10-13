import { BoardWithStats } from "@/src/types/board";
import { useState } from "react";
import TrashIcon from "@/components/icons/trash-icon";
import PenIcon from "@/components/icons/pen-icon";
import Tooltip from "@/components/ui/base/tooltip";
import ConfirmationModal from "@/components/ui/modals/confirmation-modal";

interface BoardCardProps {
  board: BoardWithStats;
  onSelect: () => void;
  mode?: "normal" | "completed" | "deleted";
  onPermanentDelete?: (boardId: number) => void;
  isSelected?: boolean;
}

export default function BoardCard({
  board,
  onSelect,
  mode = "normal",
  onPermanentDelete,
  isSelected = false,
}: BoardCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // ISO文字列またはUnix timestampを正しく処理
  const createdAt =
    typeof board.createdAt === "string"
      ? new Date(board.createdAt)
      : new Date(board.createdAt * 1000);
  const updatedAt =
    typeof board.updatedAt === "string"
      ? new Date(board.updatedAt)
      : new Date(board.updatedAt * 1000);

  // 日時を YYYY/MM/DD HH:MM 形式で表示
  const formatDateTime = (date: Date) => {
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const createdDateString = formatDateTime(createdAt);
  const updatedDateString = formatDateTime(updatedAt);

  const handlePermanentDelete = async () => {
    if (!onPermanentDelete) return;

    setIsDeleting(true);
    try {
      await onPermanentDelete(board.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("ボードの完全削除に失敗しました:", error);
      // エラー表示は親コンポーネント（board-screen.tsx）で処理
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // カード選択を防ぐ
    setShowDeleteModal(true);
  };

  return (
    <>
      <div
        onClick={onSelect}
        className={`bg-white rounded-lg border p-6 hover:shadow-md transition-all cursor-pointer relative ${
          mode === "deleted"
            ? "border-red-200 bg-red-50"
            : isSelected
              ? "border-blue-300 bg-blue-50 shadow-md"
              : "border-gray-200"
        }`}
      >
        {/* 選択状態の場合はペンアイコンを表示 */}
        {isSelected && mode !== "deleted" && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center justify-center size-6 rounded-full bg-light-Blue text-white">
              <PenIcon className="size-3" />
            </div>
          </div>
        )}

        {/* 削除済みボードの場合は削除ボタンを表示 */}
        {mode === "deleted" && onPermanentDelete && (
          <div className="absolute top-3 right-3">
            <Tooltip text="完全削除" position="bottom">
              <button
                onClick={handleDeleteClick}
                onMouseEnter={() => setIsTrashHovered(true)}
                onMouseLeave={() => setIsTrashHovered(false)}
                className={`flex items-center justify-center size-7 rounded-md transition-colors duration-200 ${
                  isTrashHovered
                    ? "bg-red-200 text-red-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                <TrashIcon className="size-4" isLidOpen={false} />
              </button>
            </Tooltip>
          </div>
        )}

        <div className="flex-1">
          <h3
            className={`text-lg font-semibold mb-2 ${
              mode === "deleted" ? "text-red-900" : "text-gray-900"
            }`}
          >
            {board.name}
          </h3>
          {board.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {board.description}
            </p>
          )}

          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="text-xs">メモ</span>
              <span className="font-medium">{board.memoCount}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="text-xs">タスク</span>
              <span className="font-medium">{board.taskCount}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="text-xs">コメント</span>
              <span className="font-medium">{board.commentCount}</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 flex gap-4">
            <div>作成: {createdDateString}</div>
            {createdAt.getTime() !== updatedAt.getTime() && (
              <div>更新: {updatedDateString}</div>
            )}
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {mode === "deleted" && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handlePermanentDelete}
          title="完全削除の確認"
          message={`「${board.name}」を完全に削除しますか？\nこの操作は取り消すことができません。`}
          confirmText="完全削除"
          isLoading={isDeleting}
          variant="danger"
          icon="trash"
          position="center"
        />
      )}
    </>
  );
}
