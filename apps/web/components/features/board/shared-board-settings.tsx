"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useToast } from "@/src/contexts/toast-context";
import TextInputWithCounter from "@/components/ui/inputs/text-input-with-counter";
import TextareaWithCounter from "@/components/ui/inputs/textarea-with-counter";
import { BoardSlackSettings } from "@/components/features/board/board-slack-settings";

interface SharedBoardSettingsProps {
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
  // Team mode props
  isTeamMode?: boolean;
  teamCustomUrl?: string;
  // Display options
  hideBackButton?: boolean;
  // Hook functions
  updateMutation: {
    mutateAsync: (data: {
      id: number;
      data: { name: string; description?: string };
    }) => Promise<any>;
    isPending: boolean;
  };
  toggleCompletionMutation: {
    mutateAsync: (id: number) => Promise<any>;
    isPending: boolean;
  };
  deleteMutation: {
    mutateAsync: (id: number) => Promise<any>;
    isPending: boolean;
  };
}

export default function SharedBoardSettings({
  boardId,
  boardSlug,
  initialBoardName,
  initialBoardDescription,
  initialBoardCompleted,
  isTeamMode = false,
  teamCustomUrl,
  hideBackButton = false,
  updateMutation,
  toggleCompletionMutation,
  deleteMutation,
}: SharedBoardSettingsProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [editName, setEditName] = useState(initialBoardName);
  const [editDescription, setEditDescription] = useState(
    initialBoardDescription || "",
  );
  const [hasChanges, setHasChanges] = useState(false);

  const handleNameChange = (value: string) => {
    setEditName(value);
    setHasChanges(
      value !== initialBoardName ||
        editDescription !== (initialBoardDescription || ""),
    );
  };

  const handleDescriptionChange = (value: string) => {
    setEditDescription(value);
    setHasChanges(
      editName !== initialBoardName ||
        value !== (initialBoardDescription || ""),
    );
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
      await updateMutation.mutateAsync({
        id: boardId,
        data: {
          name: editName.trim(),
          description: editDescription || undefined,
        },
      });
      setHasChanges(false);
    } catch (error) {
      console.error("ボード更新に失敗しました:", error);
      showToast(
        "ボード更新に失敗しました。しばらく待ってから再試行してください。",
        "error",
      );
    }
  };

  const handleToggleCompletion = async () => {
    try {
      await toggleCompletionMutation.mutateAsync(boardId);
    } catch (error) {
      console.error("ボード完了状態の変更に失敗しました:", error);
      showToast(
        "ボード完了状態の変更に失敗しました。しばらく待ってから再試行してください。",
        "error",
      );
    }
  };

  const handleDelete = async () => {
    if (confirm("このボードを削除しますか？")) {
      try {
        await deleteMutation.mutateAsync(boardId);
        const redirectPath = isTeamMode ? `/team/${teamCustomUrl}` : "/";
        router.push(redirectPath);
      } catch (error) {
        console.error("ボード削除に失敗しました:", error);
        showToast(
          "ボード削除に失敗しました。しばらく待ってから再試行してください。",
          "error",
        );
      }
    }
  };

  const handleBack = () => {
    const backPath = isTeamMode
      ? `/team/${teamCustomUrl}/board/${boardSlug}`
      : `/boards/${boardSlug}`;
    router.push(backPath);
  };

  const title = isTeamMode ? "チームボード設定" : "ボード設定";

  return (
    <div className="max-w-4xl pb-24">
      {/* ヘッダー */}
      {!hideBackButton && (
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
      )}

      <div className="space-y-4">
        {/* 基本情報 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>

          <div className="grid grid-cols-1 gap-4">
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
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={
                    updateMutation.isPending ||
                    !editName.trim() ||
                    editName.trim().length > 50 ||
                    editDescription.trim().length > 200
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {updateMutation.isPending ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={() => {
                    setEditName(initialBoardName);
                    setEditDescription(initialBoardDescription || "");
                    setHasChanges(false);
                  }}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 状態管理 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">状態管理</h2>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-gray-900 mb-1">完了状態</p>
              <p className="text-sm text-gray-500">
                {initialBoardCompleted
                  ? "このボードは完了済みです"
                  : "このボードは未完了です"}
              </p>
            </div>
            <button
              onClick={handleToggleCompletion}
              disabled={toggleCompletionMutation.isPending}
              className={`px-4 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
                initialBoardCompleted
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700"
                  : "bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700"
              }`}
            >
              {toggleCompletionMutation.isPending
                ? "処理中..."
                : initialBoardCompleted
                  ? "未完了に戻す"
                  : "完了にする"}
            </button>
          </div>
        </div>

        {/* Slack通知設定 */}
        <BoardSlackSettings boardId={boardId} />

        {/* 危険ゾーン */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-600 mb-3">
            危険ゾーン
          </h2>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
            <div>
              <p className="font-medium text-red-900">ボードを削除</p>
              <p className="text-sm text-red-600">
                この操作は元に戻せません。ボード内のメモとタスクの関連付けが削除されます。
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {deleteMutation.isPending ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
