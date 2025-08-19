"use client";

import { useState, useEffect } from "react";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import { BoardCategory } from "@/src/types/board-categories";
import { Save, Trash2 } from "lucide-react";
import DeleteCategoryModal from "./delete-category-modal";
import CloseButton from "@/components/ui/buttons/close-button";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BoardCategory | null;
  onSuccess?: () => void;
}

export default function EditCategoryModal({
  isOpen,
  onClose,
  category,
  onSuccess,
}: EditCategoryModalProps) {
  const { updateCategory, deleteCategory } = useBoardCategories();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // カテゴリーが変更されたら名前を更新
  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateCategory({
        id: category.id,
        data: { 
          name: name.trim()
        }
      });
      
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("カテゴリー更新エラー:", error);
      alert(`更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setIsDeleteModalOpen(false);
    onSuccess?.();
    handleClose();
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  if (!isOpen || !category) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative p-4 pb-3">
          <h2 className="text-lg font-semibold text-gray-900 pr-8">
            カテゴリーを編集
          </h2>
          <CloseButton onClick={handleClose} />
        </div>

        {/* フォーム */}
        <form onSubmit={handleUpdate} className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリー名 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-gray-900"
              placeholder="カテゴリー名を入力..."
              autoFocus
              required
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting || name.trim() === category.name}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {isSubmitting ? "更新中..." : "更新"}
            </button>
            
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              削除
            </button>
            
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
      
      {/* 削除確認モーダル */}
      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        category={category}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}