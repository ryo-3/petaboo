"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SettingsIcon from "@/components/icons/settings-icon";
import WarningIcon from "@/components/icons/warning-icon";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { TeamSlackSettings } from "./team-slack-settings";
import { Settings, BellRing, AlertTriangle } from "lucide-react";

interface TeamSettingsProps {
  customUrl: string;
}

type TeamSettingsTab = "basic" | "slack" | "danger";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function TeamSettings({ customUrl }: TeamSettingsProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: team, isLoading } = useTeamDetail(customUrl);
  const [activeTab, setActiveTab] = useState<TeamSettingsTab>("basic");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // チームデータが読み込まれた時にフォームを初期化
  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || "");
    }
  }, [team]);

  // エラーまたはチームが見つからない場合のリダイレクト処理
  useEffect(() => {
    if (!isLoading && !team) {
      router.push("/");
    }
  }, [isLoading, team, router]);

  if (isLoading) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (team.role !== "admin") {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
          <div className="text-center text-gray-500">
            管理者のみがチーム設定を変更できます。
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/${customUrl}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "チーム設定の更新に失敗しました");
      }

      await response.json();

      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ["team", customUrl] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });

      setSaveMessage({
        type: "success",
        text: "チーム設定を保存しました",
      });

      // 成功メッセージを3秒後に消す
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("チーム更新エラー:", error);
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "保存に失敗しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    // チーム名が正しく入力されているか確認
    if (deleteConfirmText !== team?.name) {
      setSaveMessage({
        type: "error",
        text: "チーム名が一致しません",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/${customUrl}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "チームの削除に失敗しました");
      }

      // キャッシュをクリア
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["teamStats"] });
      queryClient.removeQueries({ queryKey: ["team", customUrl] });

      // チーム削除成功フラグを設定
      sessionStorage.setItem("showTeamListAfterCreation", "true");

      // ホーム画面のチーム一覧に戻る
      router.push("/");
    } catch (error) {
      console.error("チーム削除エラー:", error);
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "削除に失敗しました",
      });
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const tabItems = [
    {
      id: "basic" as const,
      label: "基本情報",
      icon: <Settings className="w-4 h-4 text-blue-600" />,
    },
    {
      id: "slack" as const,
      label: "Slack連携",
      icon: <BellRing className="w-4 h-4 text-purple-600" />,
    },
    {
      id: "danger" as const,
      label: "危険な操作",
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
    },
  ];

  return (
    <div className="bg-white flex flex-col overflow-hidden h-full">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-[22px] font-bold text-gray-800">チーム設定</h1>
          <span className="text-sm text-gray-600 ml-4">
            {team.name} の管理設定
          </span>
        </div>
      </div>

      {/* サイドバーとメインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <div className="w-[180px] border-r border-gray-200 pt-3 px-3">
          <nav className="space-y-1">
            {tabItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 px-6 pt-4 overflow-y-auto">
          <div className="max-w-2xl">
            {/* 基本情報タブ */}
            {activeTab === "basic" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  チーム基本情報
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* チーム名 */}
                  <div>
                    <label
                      htmlFor="teamName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      チーム名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="teamName"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例: マーケティングチーム"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={50}
                      required
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        プロジェクトや部署など、わかりやすい名前を付けましょう
                      </span>
                      <span className="text-xs text-gray-400">
                        {name.length}/50
                      </span>
                    </div>
                  </div>

                  {/* チーム説明 */}
                  <div>
                    <label
                      htmlFor="teamDescription"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      チーム説明（任意）
                    </label>
                    <textarea
                      id="teamDescription"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="例: マーケティング戦略の企画・実行を行うチームです"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      maxLength={200}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        チームの目的や役割を簡潔に説明しましょう
                      </span>
                      <span className="text-xs text-gray-400">
                        {description.length}/200
                      </span>
                    </div>
                  </div>

                  {/* 保存ボタン */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!name.trim() || isSaving}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "保存中..." : "設定を保存"}
                    </button>
                  </div>

                  {/* 保存メッセージ */}
                  {saveMessage && (
                    <div
                      className={`mt-4 p-3 rounded-lg text-sm ${
                        saveMessage.type === "success"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {saveMessage.text}
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Slack連携タブ */}
            {activeTab === "slack" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Slack通知連携
                </h2>
                {team && <TeamSlackSettings teamId={team.id} />}
              </div>
            )}

            {/* 危険な操作タブ */}
            {activeTab === "danger" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  危険な操作
                </h2>
                <Card className="p-6 border-red-300 bg-red-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <WarningIcon className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-red-900 text-base">
                      チームの完全削除
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                      <p className="text-sm text-red-800 font-semibold mb-1 flex items-center gap-1">
                        <svg
                          className="w-4 h-4 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                        </svg>
                        完全削除警告
                      </p>
                      <p className="text-sm text-red-700 mb-2">
                        チーム削除により以下がすべて
                        <strong>完全に削除</strong>
                        され、<strong>復元不可能</strong>になります：
                      </p>
                      <ul className="text-sm text-red-700 space-y-1 list-disc list-inside ml-2">
                        <li>すべてのメモ・タスク・ボード</li>
                        <li>すべてのメンバー・権限設定</li>
                        <li>すべての招待・申請履歴</li>
                        <li>すべてのカテゴリ・タグ</li>
                      </ul>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-red-700 border-red-400 hover:bg-red-100 font-semibold"
                      onClick={() => {
                        setShowDeleteModal(true);
                        setDeleteConfirmText("");
                      }}
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                      チームを完全削除する
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border-2 border-red-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-900">
                  チームを完全削除
                </h2>
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
                    <strong>全メモ・タスク・ボード</strong> → 完全消失
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>
                    <strong>全メンバー・権限</strong> → アクセス不可
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>
                    <strong>招待・履歴・設定</strong> → 全て消去
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>
                    <strong>カテゴリ・タグ</strong> → 復元不可能
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
                  この操作により全てのデータが永久に失われます
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                削除を確認するには、チーム名「<strong>{team?.name}</strong>
                」を入力してください
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={team?.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* エラーメッセージ */}
            {saveMessage && saveMessage.type === "error" && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {saveMessage.text}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setSaveMessage(null);
                }}
                className="flex-1"
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== team?.name || isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
