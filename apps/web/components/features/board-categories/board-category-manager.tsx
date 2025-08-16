"use client";

import { useState } from "react";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import { BoardCategory, NewBoardCategory, UpdateBoardCategory } from "@/src/types/board-categories";
import { Plus, Edit2, Trash2, GripVertical, Save, X } from "lucide-react";

export default function BoardCategoryManager() {
  const { 
    categories, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    reorderCategories,
    isLoading 
  } = useBoardCategories();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState<NewBoardCategory>({
    name: "",
    boardId: 1, // デフォルト値（実際の使用時は動的に設定）
    icon: ""
  });
  const [editingCategory, setEditingCategory] = useState<UpdateBoardCategory>({
    name: "",
    icon: ""
  });

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;
    
    try {
      await createCategory({
        ...newCategory,
        name: newCategory.name.trim()
      });
      setNewCategory({ name: "", boardId: 1, icon: "" });
      setIsCreating(false);
    } catch (error) {
      console.error("カテゴリー作成エラー:", error);
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingCategory.name?.trim()) return;

    try {
      await updateCategory({ id, data: {
        ...editingCategory,
        name: editingCategory.name.trim()
      }});
      setEditingId(null);
      setEditingCategory({ name: "", icon: "" });
    } catch (error) {
      console.error("カテゴリー更新エラー:", error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("このカテゴリーを削除しますか？")) return;

    try {
      await deleteCategory(id);
    } catch (error) {
      console.error("カテゴリー削除エラー:", error);
    }
  };

  const startEdit = (category: BoardCategory) => {
    setEditingId(category.id);
    setEditingCategory({
      name: category.name,
      icon: category.icon || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingCategory({ name: "", icon: "" });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewCategory({ name: "", boardId: 1, icon: "" });
  };

  if (isLoading) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ボードカテゴリー管理</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          新規作成
        </button>
      </div>

      {/* 新規作成フォーム */}
      {isCreating && (
        <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">新しいカテゴリーを作成</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリー名 *
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="カテゴリー名を入力"
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateCategory}
              disabled={!newCategory.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              作成
            </button>
            <button
              onClick={cancelCreate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X size={16} />
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* カテゴリー一覧 */}
      <div className="space-y-3">
        {categories && categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            カテゴリーがありません。新規作成ボタンからカテゴリーを作成してください。
          </div>
        ) : (
          categories?.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow"
            >
              <div className="cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical size={16} />
              </div>


              {editingId === category.id ? (
                <div className="flex-1">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{category.name}</div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editingId === category.id ? (
                  <>
                    <button
                      onClick={() => handleUpdateCategory(category.id)}
                      disabled={!editingCategory.name?.trim()}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(category)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {categories && categories.length > 0 && (
        <div className="mt-6 text-sm text-gray-500">
          <p>• ドラッグして並び順を変更できます</p>
          <p>• カテゴリーを削除すると、そのカテゴリーに属するボードは「未分類」になります</p>
        </div>
      )}
    </div>
  );
}