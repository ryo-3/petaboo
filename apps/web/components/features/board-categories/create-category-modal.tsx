"use client";

import { useState } from "react";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import { NewBoardCategory, BoardCategory } from "@/src/types/board-categories";
import { X, Save } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            新しいボードカテゴリーを作成
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリー名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="カテゴリー名を入力..."
              autoFocus
              required
            />
          </div>

          {/* 既存カテゴリー一覧 */}
          {existingCategories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">既存のカテゴリー</h4>
              <div className="flex flex-wrap gap-2">
                {existingCategories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!formData.name.trim() || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {isSubmitting ? "作成中..." : "作成"}
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
    </div>
  );
}