import { useState } from "react";
import { CreateBoardData, UpdateBoardData } from "@/src/types/board";
import TextInputWithCounter from "@/components/ui/inputs/text-input-with-counter";

interface BoardFormProps {
  initialData?: UpdateBoardData;
  onSubmit: (data: CreateBoardData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function BoardForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: BoardFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim().length <= 30) {
      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initialData ? "ボードを編集" : "新しいボード"}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInputWithCounter
          id="name"
          value={name}
          onChange={setName}
          placeholder="例: プロジェクト名、学習テーマなど（30文字以内）"
          maxLength={30}
          label="ボード名"
          required
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            説明（任意）
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ボードの目的や内容について簡単に説明してください"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim() || name.trim().length > 30 || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "保存中..." : initialData ? "更新" : "作成"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}