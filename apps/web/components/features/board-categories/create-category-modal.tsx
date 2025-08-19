"use client";

import { useState } from "react";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import { NewBoardCategory, BoardCategory } from "@/src/types/board-categories";
import { Save, Pencil } from "lucide-react";
import EditCategoryModal from "./edit-category-modal";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (categoryId: number) => void;
  existingCategories?: BoardCategory[];
  boardId: number;
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  existingCategories = [],
  boardId,
}: CreateCategoryModalProps) {
  const { createCategory } = useBoardCategories();
  const [formData, setFormData] = useState<NewBoardCategory>({
    name: "",
    boardId,
    icon: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BoardCategory | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // カテゴリー数が上限に達しているかチェック
  const isAtLimit = existingCategories.length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isAtLimit) return;

    setIsSubmitting(true);
    try {
      const newCategory = await createCategory({
        ...formData,
        name: formData.name.trim()
      });
      
      // 成功時の処理
      onSuccess(newCategory.id);
      
      // フォームをリセット
      setFormData({
        name: "",
        boardId,
        icon: ""
      });
      
      onClose();
    } catch (error) {
      console.error("カテゴリー作成エラー:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      boardId,
      icon: ""
    });
    onClose();
  };

  const handleEditClick = (category: BoardCategory) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            新しいボードカテゴリーを作成
          </h2>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリー名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-2 focus:border-gray-900"
              placeholder={isAtLimit ? "上限に達しました" : "カテゴリー名を入力..."}
              autoFocus
              required
              disabled={isAtLimit}
            />
          </div>

          {/* 既存カテゴリー一覧 */}
          {existingCategories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                既存のカテゴリー ({existingCategories.length}/10)
              </h4>
              <div className="flex flex-col gap-1">
                {existingCategories.map((category) => (
                  <div
                    key={category.id}
                    className="text-sm text-gray-700 py-1 px-2 -mx-2 rounded flex items-center justify-between group hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEditClick(category)}
                  >
                    <span>{category.name}</span>
                    <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!formData.name.trim() || isSubmitting || isAtLimit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {isAtLimit ? "上限に達しました" : isSubmitting ? "作成中..." : "作成"}
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
      
      {/* 編集モーダル */}
      <EditCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
        }}
      />
    </div>
  );
}