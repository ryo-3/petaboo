"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useToast } from "@/src/contexts/toast-context";
import TextInputWithCounter from "@/components/ui/inputs/text-input-with-counter";
import TextareaWithCounter from "@/components/ui/inputs/textarea-with-counter";
import { BoardSlackSettings } from "@/components/features/board/board-slack-settings";
import { UpdateBoardData } from "@/src/types/board";
import { useQueryClient } from "@tanstack/react-query";

interface SharedBoardSettingsProps {
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
  // Team mode props
  isTeamMode?: boolean;
  teamCustomUrl?: string;
  teamId?: number;
  // Display options
  hideBackButton?: boolean;
  // Hook functions
  updateMutation: {
    mutateAsync: (data: { id: number; data: UpdateBoardData }) => Promise<any>;
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
  teamId,
  hideBackButton = false,
  updateMutation,
  toggleCompletionMutation,
  deleteMutation,
}: SharedBoardSettingsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [editName, setEditName] = useState(initialBoardName);
  const [editDescription, setEditDescription] = useState(
    initialBoardDescription || "",
  );
  const [editSlug, setEditSlug] = useState(boardSlug);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleNameChange = (value: string) => {
    setEditName(value);
    setHasChanges(
      value !== initialBoardName ||
        editDescription !== (initialBoardDescription || "") ||
        editSlug !== boardSlug,
    );
  };

  const handleDescriptionChange = (value: string) => {
    setEditDescription(value);
    setHasChanges(
      editName !== initialBoardName ||
        value !== (initialBoardDescription || "") ||
        editSlug !== boardSlug,
    );
  };

  const handleSlugChange = (value: string) => {
    // 英数字とハイフンのみ許可、大文字に変換
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setEditSlug(sanitized);
    setHasChanges(
      editName !== initialBoardName ||
        editDescription !== (initialBoardDescription || "") ||
        sanitized !== boardSlug,
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
      const isSlugChanging = editSlug !== boardSlug;

      // slug変更の場合は、mutation完了後に手動でキャッシュクリアとリダイレクト
      await updateMutation.mutateAsync({
        id: boardId,
        data: {
          name: editName.trim(),
          description: editDescription || undefined,
          slug: isSlugChanging ? editSlug : undefined,
        },
      });

      setHasChanges(false);

      // slugが変更された場合は、onSuccessのキャッシュ無効化より先にリダイレクト
      if (isSlugChanging) {
        // リダイレクト前に全てのクエリを無効化してリフェッチを防ぐ
        if (isTeamMode && teamId) {
          // すべてのクエリをキャンセルして無効化
          queryClient.cancelQueries();
          // チームボード関連のキャッシュを完全削除
          queryClient.removeQueries({
            queryKey: ["team-boards", teamId],
          });
          queryClient.removeQueries({
            queryKey: ["team-board", teamId],
          });
        } else {
          queryClient.cancelQueries();
          queryClient.removeQueries({
            queryKey: ["boards"],
          });
        }

        // 即座にリダイレクト
        const redirectPath = isTeamMode
          ? `/team/${teamCustomUrl}?board=${editSlug}&settings=true`
          : `/boards/${editSlug}?settings=true`;
        router.replace(redirectPath);
      }
      // slug変更なしの場合は、useUpdateTeamBoardのonSuccessで自動的にキャッシュ無効化される
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

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(boardId);
      // 削除成功後、3秒間「削除中...」を表示してからリダイレクト
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // リダイレクト前にキャッシュを完全削除
      if (isTeamMode && teamId) {
        ["normal", "completed", "deleted"].forEach((status) => {
          queryClient.removeQueries({
            queryKey: ["team-boards", teamId, status],
          });
        });
      } else {
        ["normal", "completed", "deleted"].forEach((status) => {
          queryClient.removeQueries({
            queryKey: ["boards", status],
          });
        });
      }

      // 削除成功フラグをsessionStorageに保存（リダイレクト直前）
      sessionStorage.setItem("boardDeleted", "true");
      setIsDeleteDialogOpen(false);
      const redirectPath = isTeamMode ? `/team/${teamCustomUrl}?boards` : "/";
      router.push(redirectPath);
    } catch (error) {
      console.error("ボード削除に失敗しました:", error);
      showToast(
        "ボード削除に失敗しました。しばらく待ってから再試行してください。",
        "error",
      );
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    const backPath = isTeamMode
      ? `/team/${teamCustomUrl}?board=${boardSlug}`
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

            <div>
              <TextInputWithCounter
                value={editSlug}
                onChange={(value) => handleSlugChange(value)}
                placeholder="例: MY-PROJECT-BOARD（大文字英数字とハイフンのみ、50文字以内）"
                maxLength={50}
                label="スラッグ（URL用の識別子）"
                className="px-4 py-3"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL: {isTeamMode ? `/team/${teamCustomUrl}?board=` : `/boards/`}
                <span className="font-mono font-semibold text-blue-600">
                  {editSlug}
                </span>
              </p>
              {editSlug !== boardSlug && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ スラッグを変更すると既存のURLが無効になります
                </p>
              )}
            </div>

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
                    setEditSlug(boardSlug);
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

        {/* Slack通知設定（チームモードのみ表示） */}
        {isTeamMode && <BoardSlackSettings boardId={boardId} />}

        {/* 危険ゾーン */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-600 mb-3">
            危険ゾーン
          </h2>

          <div className="flex flex-col p-3 bg-white rounded-lg border border-red-200">
            <div className="mb-4">
              <p className="font-medium text-red-900">ボードを削除</p>
              <div className="text-sm text-red-600 space-y-2">
                <p className="font-semibold">この操作は取り消せません。</p>
                <div>
                  <p className="font-medium mb-1">削除されるもの：</p>
                  <ul className="list-disc list-inside pl-2 space-y-0.5">
                    <li>ボード本体とボードコメント</li>
                    <li>メモ・タスクとの紐づけ</li>
                  </ul>
                </div>
                <p className="text-xs">
                  ※メモ・タスク本体とメモタスク本体に紐づいてるコメントは削除されません
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting}
              className="self-end px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {isDeleting ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border-2 border-red-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-900">ボードを削除</h2>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-100 via-red-50 to-red-100 border-2 border-red-300 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-900 font-bold mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <strong>完全削除される内容</strong>
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>
                    <strong>ボード本体とボードコメント</strong> → 完全消失
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>
                    <strong>メモ・タスクとの紐づけ</strong> → 削除
                  </span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-red-200 rounded border-l-4 border-red-600">
                <p className="text-xs text-red-900 font-bold flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.6 11.48L19.44 8.3a.63.63 0 0 0-.59-.91h-2.44l.61-2.24a.63.63 0 0 0-1.06-.59l-6.12 5.87a.63.63 0 0 0 .59.91h2.44l-.61 2.24a.63.63 0 0 0 1.06.59l6.12-5.87a.63.63 0 0 0-.04-.93z" />
                  </svg>
                  この操作は取り消せません
                </p>
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded border-l-4 border-blue-500">
                <p className="text-xs text-blue-900 font-semibold">
                  ※ メモ・タスク本体とそれらへのコメントは削除されません
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                削除を確認するには、ボードスラッグ「
                <strong className="text-red-600">{boardSlug}</strong>
                」を入力してください
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={boardSlug}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== boardSlug || isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
