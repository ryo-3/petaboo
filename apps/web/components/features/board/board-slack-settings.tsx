"use client";

import { useState, useEffect } from "react";
import {
  useBoardSlackConfig,
  useSaveBoardSlackConfig,
  useDeleteBoardSlackConfig,
  useTestBoardSlackNotification,
} from "@/src/hooks/use-board-slack-config";

interface BoardSlackSettingsProps {
  boardId: number;
}

export function BoardSlackSettings({ boardId }: BoardSlackSettingsProps) {
  const { data: slackConfig, isLoading } = useBoardSlackConfig(boardId);
  const saveMutation = useSaveBoardSlackConfig(boardId);
  const deleteMutation = useDeleteBoardSlackConfig(boardId);
  const testMutation = useTestBoardSlackNotification(boardId);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Slack設定が読み込まれた時にフォームを初期化
  useEffect(() => {
    if (slackConfig) {
      setWebhookUrl(slackConfig.webhookUrl);
      setIsEnabled(slackConfig.isEnabled);
    }
  }, [slackConfig]);

  const handleSave = async () => {
    setMessage(null);

    try {
      await saveMutation.mutateAsync({
        webhookUrl,
        isEnabled,
      });

      setMessage({
        type: "success",
        text: "Slack連携設定を保存しました",
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "保存に失敗しました",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Slack連携設定を削除しますか？")) return;

    setMessage(null);

    try {
      await deleteMutation.mutateAsync();

      setWebhookUrl("");
      setIsEnabled(true);

      setMessage({
        type: "success",
        text: "Slack連携設定を削除しました",
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "削除に失敗しました",
      });
    }
  };

  const handleTest = async () => {
    setMessage(null);

    try {
      await testMutation.mutateAsync();

      setMessage({
        type: "success",
        text: "テスト通知を送信しました！Slackを確認してください",
      });

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "テスト通知の送信に失敗しました",
      });
    }
  };

  const isValidWebhookUrl =
    webhookUrl.trim() &&
    webhookUrl.startsWith("https://hooks.slack.com/services/");

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-purple-600"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2zm2-8a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2zm8 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-2 8a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900">
          ボード専用Slack通知
        </h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        このボードに紐づくメモ・タスク・コメントの通知を、専用のSlackチャンネルに送信できます。
        <br />
        設定しない場合は、チーム全体のSlack設定が使用されます。
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Slackワークスペースの設定から Incoming Webhook
            を作成してURLを取得してください
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`board-slack-enabled-${boardId}`}
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor={`board-slack-enabled-${boardId}`}
            className="text-sm text-gray-700"
          >
            通知を有効にする
          </label>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={!isValidWebhookUrl || saveMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {saveMutation.isPending ? "保存中..." : "保存"}
          </button>

          {slackConfig && (
            <>
              <button
                onClick={handleTest}
                disabled={!isValidWebhookUrl || testMutation.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {testMutation.isPending ? "送信中..." : "テスト通知"}
              </button>

              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {deleteMutation.isPending ? "削除中..." : "設定を削除"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
