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
  currentCategoryId?: number | null;
  onCategorySelect?: (categoryId: number | null) => void;
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  existingCategories = [],
  boardId,
  currentCategoryId,
  onCategorySelect,
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

  // カテゴリー名の重複チェック
  const isDuplicate = existingCategories.some(
    category => category.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
  );

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

  const handleEditClick = (category: BoardCategory, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  const handleCategoryClick = (category: BoardCategory) => {
    if (onCategorySelect) {
      onCategorySelect(category.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 min-h-[75vh] max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            ボードカテゴリー
          </h2>
        </div>

        {/* フォーム */}
        <div className="flex-1 px-4 pb-4 overflow-hidden">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* 新規カテゴリー作成 */}
          <div className="flex-shrink-0 mb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSubmitting) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  className={`w-full px-3 py-2 pr-12 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                    formData.name.length > 50 || isDuplicate
                      ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                      : "border-gray-200 focus:ring-gray-400 focus:border-gray-400"
                  }`}
                  placeholder={isAtLimit ? "上限に達しました" : "新しいカテゴリー名を入力..."}
                  autoFocus
                  required
                  disabled={isAtLimit}
                />
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${formData.name.length > 50 || isDuplicate ? "text-red-500" : "text-gray-500"}`}>
                  {isDuplicate ? "重複" : `${formData.name.length}/50`}
                </div>
              </div>
              <button
                type="submit"
                disabled={!formData.name.trim() || isSubmitting || isAtLimit || formData.name.length > 50 || isDuplicate}
                className="px-4 py-2 bg-Green text-white rounded-md text-sm font-medium hover:bg-Green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={16} />
                {isSubmitting ? "作成中..." : "作成"}
              </button>
            </div>
          </div>

          {/* 既存カテゴリー一覧 */}
          {existingCategories.length > 0 && (
            <div className="flex-1 min-h-0">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                既存のカテゴリー ({existingCategories.length}/10)
              </h4>
              <div className="h-[27rem] overflow-y-auto">
                <div className="flex flex-col gap-1 pr-2">
                  {existingCategories
                    .sort((a, b) => {
                      if (a.id === currentCategoryId) return -1;
                      if (b.id === currentCategoryId) return 1;
                      return 0;
                    })
                    .map((category) => {
                    const isSelected = currentCategoryId === category.id;
                    return (
                      <div
                        key={category.id}
                        className={`text-sm py-1 px-2 -mx-2 rounded flex items-center justify-between group cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-gray-100 text-gray-800 font-medium" 
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => handleCategoryClick(category)}
                      >
                        <span className="flex-1">{category.name}</span>
                        <button
                          onClick={(e) => handleEditClick(category, e)}
                          className="flex-shrink-0 w-6 h-6 ml-2 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                        >
                          <Pencil className={`w-3 h-3 transition-opacity ${
                            isSelected 
                              ? "text-gray-600 opacity-100" 
                              : "text-gray-400 opacity-0 group-hover:opacity-100"
                          }`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </form>
        </div>
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