"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useTeamSlackConfig,
  useSaveTeamSlackConfig,
  useDeleteTeamSlackConfig,
  useTestSlackNotification,
} from "@/src/hooks/use-team-slack-config";

interface TeamSlackSettingsProps {
  teamId: number;
}

export function TeamSlackSettings({ teamId }: TeamSlackSettingsProps) {
  const { data: slackConfig, isLoading } = useTeamSlackConfig(teamId);
  const saveMutation = useSaveTeamSlackConfig(teamId);
  const deleteMutation = useDeleteTeamSlackConfig(teamId);
  const testMutation = useTestSlackNotification(teamId);

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
      <Card className="p-6 bg-gray-50">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gray-50">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-purple-600"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2zm2-8a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2zm8 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-2 8a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2z" />
        </svg>
        <h3 className="font-semibold text-gray-800 text-sm">Slack連携設定</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
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
            id={`slack-enabled-${teamId}`}
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label
            htmlFor={`slack-enabled-${teamId}`}
            className="text-sm text-gray-700"
          >
            通知を有効にする
          </label>
        </div>

        <div className="pt-2 border-t flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!isValidWebhookUrl || saveMutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
          >
            {saveMutation.isPending ? "保存中..." : "保存"}
          </Button>

          {slackConfig && (
            <>
              <Button
                onClick={handleTest}
                disabled={!isValidWebhookUrl || testMutation.isPending}
                variant="outline"
                className="text-sm"
              >
                {testMutation.isPending ? "送信中..." : "テスト"}
              </Button>

              <Button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                variant="outline"
                className="text-sm text-red-600 hover:text-red-700"
              >
                削除
              </Button>
            </>
          )}
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-xs ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-gray-600 mb-2 font-medium">
            📬 通知される内容:
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside ml-2">
            <li>コメントで @メンション されたとき</li>
            <li className="text-gray-400">タスク割り当て（今後追加予定）</li>
            <li className="text-gray-400">チーム参加申請（今後追加予定）</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
