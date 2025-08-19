"use client";

import { useState, useEffect } from "react";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import { BoardCategory } from "@/src/types/board-categories";
import { Save, Trash2 } from "lucide-react";
import DeleteCategoryModal from "./delete-category-modal";
import CloseButton from "@/components/ui/buttons/close-button";
import PenIcon from "@/components/icons/pen-icon";
import TrashIcon from "@/components/icons/trash-icon";

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
  const { updateCategory, deleteCategory, categories } = useBoardCategories(category?.boardId);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // 他のカテゴリーとの重複チェック（自分自身は除外）
  const isDuplicate = categories.some(
    cat => cat.id !== category?.id && cat.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

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
          name: name.trim(),
          boardId: category.boardId
        }
      });
      
      // 0.5秒遅延
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("カテゴリー更新エラー:", error);
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
          <h2 className="text-base font-semibold text-gray-900 pr-8 flex items-center gap-2">
            <PenIcon className="size-4" />
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
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3 py-2 pr-12 border rounded-md text-sm focus:outline-none ${
                  name.length > 50 || isDuplicate
                    ? "border-red-400 ring-1 ring-red-400 focus:ring-red-400 focus:border-red-400"
                    : "border-gray-200 focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                }`}
                placeholder="カテゴリー名を入力..."
                autoFocus
                required
              />
              <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${name.length > 50 || isDuplicate ? "text-red-500" : "text-gray-500"}`}>
                {isDuplicate ? "重複" : `${name.length}/50`}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium disabled:opacity-50"
            >
              <TrashIcon className="size-4" />
              削除
            </button>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting || name.trim() === category?.name || name.length > 50 || isDuplicate}
                className="flex items-center justify-center gap-1 w-20 py-2 bg-Green text-white rounded-md text-sm font-medium hover:bg-Green/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isSubmitting && <Save size={16} />}
                {isSubmitting ? "更新中..." : "更新"}
              </button>
            </div>
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