"use client";

import { useState } from "react";
import { useDeleteTag } from "@/src/hooks/use-tags";
import { Tag } from "@/src/types/tag";
import { Trash2, AlertTriangle } from "lucide-react";
import CloseButton from "@/components/ui/buttons/close-button";

interface DeleteTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag | null;
  tagStats?: {
    usageCount: number;
    memoCount: number;
    taskCount: number;
    boardCount: number;
  } | null;
  onSuccess?: () => void;
}

export default function DeleteTagModal({
  isOpen,
  onClose,
  tag,
  tagStats,
  onSuccess,
}: DeleteTagModalProps) {
  const deleteTagMutation = useDeleteTag();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tag) return;

    setIsDeleting(true);
    try {
      await deleteTagMutation.mutateAsync(tag.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("タグの削除に失敗:", error);
      alert("タグの削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !tag) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative p-4 pb-3">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              タグを削除
            </h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* 内容 */}
        <div className="px-4 pb-4">
          <p className="text-gray-600 mb-2">
            「<span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mx-1"
              style={{
                backgroundColor: tag.color,
                color: '#374151',
              }}
            >
              {tag.name}
            </span>」を削除しますか？
          </p>
          
          {tagStats && tagStats.usageCount > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                このタグは<span className="font-medium">{tagStats.usageCount}件</span>で使用されています：
              </p>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                {tagStats.memoCount > 0 && <li>• メモ: {tagStats.memoCount}件</li>}
                {tagStats.taskCount > 0 && <li>• タスク: {tagStats.taskCount}件</li>}
                {tagStats.boardCount > 0 && <li>• ボード: {tagStats.boardCount}件</li>}
              </ul>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mb-6">
            この操作は取り消せません。関連付けられた全てのアイテムからタグが削除されます。
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