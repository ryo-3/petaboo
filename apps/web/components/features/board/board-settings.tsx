"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useToggleBoardCompletion, useDeleteBoard, useUpdateBoard } from "@/src/hooks/use-boards";
import { useToast } from "@/src/contexts/toast-context";
import TextInputWithCounter from "@/components/ui/inputs/text-input-with-counter";
import TextareaWithCounter from "@/components/ui/inputs/textarea-with-counter";

interface BoardSettingsProps {
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
}

export default function BoardSettings({
  boardId,
  boardSlug,
  initialBoardName,
  initialBoardDescription,
  initialBoardCompleted
}: BoardSettingsProps) {
  const router = useRouter();
  const toggleCompletion = useToggleBoardCompletion();
  const deleteBoard = useDeleteBoard();
  const updateBoard = useUpdateBoard();
  const { showToast } = useToast();

  const [editName, setEditName] = useState(initialBoardName);
  const [editDescription, setEditDescription] = useState(initialBoardDescription || "");
  const [hasChanges, setHasChanges] = useState(false);

  const handleNameChange = (value: string) => {
    setEditName(value);
    setHasChanges(value !== initialBoardName || editDescription !== (initialBoardDescription || ""));
  };

  const handleDescriptionChange = (value: string) => {
    setEditDescription(value);
    setHasChanges(editName !== initialBoardName || value !== (initialBoardDescription || ""));
  };

  const handleSave = async () => {
    if (editName.trim().length === 0) {
      showToast("ボード名を入力してください。", "error");
      return;
    }
    
    if (editName.trim().length > 50) {
      showToast("ボード名は50文字以内で入力してください。", "error");
      return;
    }
    
    if (editDescription.trim().length > 200) {
      showToast("説明は200文字以内で入力してください。", "error");
      return;
    }
    
    try {
      await updateBoard.mutateAsync({
        id: boardId,
        data: {
          name: editName.trim(),
          description: editDescription || undefined,
        },
      });
      setHasChanges(false);
    } catch (error) {
      console.error("ボード更新に失敗しました:", error);
      showToast("ボード更新に失敗しました。しばらく待ってから再試行してください。", "error");
    }
  };

  const handleToggleCompletion = async () => {
    try {
      await toggleCompletion.mutateAsync(boardId);
    } catch (error) {
      console.error("ボード完了状態の変更に失敗しました:", error);
      showToast("ボード完了状態の変更に失敗しました。しばらく待ってから再試行してください。", "error");
    }
  };

  const handleDelete = async () => {
    if (confirm("このボードを削除しますか？")) {
      try {
        await deleteBoard.mutateAsync(boardId);
        router.push("/"); // 削除後はボード一覧に戻る
      } catch (error) {
        console.error("ボード削除に失敗しました:", error);
        showToast("ボード削除に失敗しました。しばらく待ってから再試行してください。", "error");
      }
    }
  };

  const handleBack = () => {
    router.push(`/boards/${boardSlug}`);
  };

  return (
    <div className="max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">ボード設定</h1>
      </div>

      <div className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">基本情報</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <TextInputWithCounter
              value={editName}
              onChange={(value) => handleNameChange(value)}
              placeholder="ボード名を入力（50文字以内）"
              maxLength={50}
              label="ボード名"
              className="px-4 py-3"
            />

            <TextareaWithCounter
              value={editDescription}
              onChange={(value) => handleDescriptionChange(value)}
              placeholder="ボードの説明を入力（200文字以内）"
              maxLength={200}
              label="説明"
              className="px-4 py-3"
              rows={4}
            />

            {hasChanges && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={updateBoard.isPending || !editName.trim() || editName.trim().length > 50 || editDescription.trim().length > 200}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {updateBoard.isPending ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={() => {
                    setEditName(initialBoardName);
                    setEditDescription(initialBoardDescription || "");
                    setHasChanges(false);
                  }}
                  disabled={updateBoard.isPending}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 状態管理 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">状態管理</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 mb-1">完了状態</p>
                <p className="text-sm text-gray-500">
                  {initialBoardCompleted ? "このボードは完了済みです" : "このボードは未完了です"}
                </p>
              </div>
              <button
                onClick={handleToggleCompletion}
                disabled={toggleCompletion.isPending}
                className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                  initialBoardCompleted 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                    : 'bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700'
                }`}
              >
                {toggleCompletion.isPending ? "処理中..." : initialBoardCompleted ? "未完了に戻す" : "完了にする"}
              </button>
            </div>
          </div>
        </div>

        {/* 危険ゾーン */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-6">危険ゾーン</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
              <div>
                <p className="font-medium text-red-900 mb-1">ボードを削除</p>
                <p className="text-sm text-red-600">
                  この操作は元に戻せません。ボード内のメモとタスクの関連付けが削除されます。
                </p>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleteBoard.isPending}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {deleteBoard.isPending ? "削除中..." : "削除"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}