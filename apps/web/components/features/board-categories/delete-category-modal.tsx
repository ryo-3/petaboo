"use client";

import { useState } from "react";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import { BoardCategory } from "@/src/types/board-categories";
import { Trash2, AlertTriangle } from "lucide-react";
import CloseButton from "@/components/ui/buttons/close-button";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BoardCategory | null;
  onSuccess?: () => void;
}

export default function DeleteCategoryModal({
  isOpen,
  onClose,
  category,
  onSuccess,
}: DeleteCategoryModalProps) {
  const { deleteCategory } = useBoardCategories();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!category) return;

    setIsDeleting(true);
    try {
      await deleteCategory(category.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("カテゴリー削除エラー:", error);
      alert("カテゴリーの削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative p-4 pb-3">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              カテゴリーを削除
            </h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* 内容 */}
        <div className="px-4 pb-4">
          <p className="text-gray-600 mb-4">
            「<span className="font-medium text-gray-900">{category.name}</span>
            」を削除しますか？
          </p>
          <p className="text-sm text-gray-500 mb-6">
            この操作は取り消せません。
          </p>

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={16} />
              {isDeleting ? "削除中..." : "削除"}
            </button>

            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
