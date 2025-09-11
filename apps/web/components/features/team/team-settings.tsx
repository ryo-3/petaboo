"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useKickMember } from "@/src/hooks/use-kick-member";

interface TeamSettingsProps {
  customUrl: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function TeamSettings({ customUrl }: TeamSettingsProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: team, isLoading } = useTeamDetail(customUrl);
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
  const [kickConfirmModal, setKickConfirmModal] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const kickMutation = useKickMember();

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

      const updatedTeam = await response.json();

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

  const handleKickMember = (userId: string, displayName: string) => {
    setKickConfirmModal({ userId, displayName });
  };

  const confirmKickMember = async () => {
    if (!kickConfirmModal) return;

    try {
      await kickMutation.mutateAsync({
        customUrl,
        userId: kickConfirmModal.userId,
      });
      setKickConfirmModal(null);
      setSaveMessage({
        type: "success",
        text: `${kickConfirmModal.displayName}をチームから削除しました`,
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "メンバーの削除に失敗しました",
      });
      setTimeout(() => setSaveMessage(null), 3000);
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
      // 現在のチーム詳細キャッシュも削除
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

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <div className="w-full pt-3 pl-5 pr-5 flex flex-col">
        {/* ヘッダー */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push(`/team/${customUrl}`)}
              className="p-1 text-gray-600 hover:text-gray-800 transition-colors rounded-md hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-bold text-gray-800">チーム設定</h1>
          </div>
          <p className="text-gray-600 text-sm ml-11">
            チームの基本情報と管理設定
          </p>
        </div>

        {/* フォームエリア */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* チーム名 */}
                <div>
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-semibold text-gray-700 mb-2"
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
                    className="block text-sm font-semibold text-gray-700 mb-2"
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

                {/* アクションボタン */}
                <div className="pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={!name.trim() || isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSaving ? "保存中..." : "設定を保存"}
                  </Button>
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
            </Card>

            {/* 右側のコンテンツ */}
            <div className="space-y-6">
              {/* 危険な操作 */}
              <Card className="p-6 border-red-300 bg-red-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <h3 className="font-bold text-red-900 text-base flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-red-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2L1 21h22L12 2zm0 3.5L19.5 19h-15L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                    </svg>
                    危険な操作
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
                      チーム削除により以下がすべて<strong>完全に削除</strong>
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

              {/* メンバー管理 */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-800 mb-4 text-base">
                  メンバー管理
                </h3>
                {team?.members && team.members.length > 0 ? (
                  <div className="space-y-3">
                    {team.members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {member.displayName?.[0]?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {member.displayName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.role === "admin" ? "管理者" : "メンバー"}
                            </div>
                          </div>
                        </div>
                        {member.role !== "admin" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() =>
                              handleKickMember(
                                member.userId,
                                member.displayName ||
                                  `ユーザー${member.userId.slice(-4)}`,
                              )
                            }
                          >
                            削除
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    メンバー情報を取得中...
                  </p>
                )}
              </Card>

              {/* 今後の機能予定 */}
              <Card className="p-6 bg-gray-50">
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                  今後追加予定の機能
                </h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-green-600 rounded-full"></span>
                    <span className="line-through text-green-700">
                      メンバーの招待・削除機能
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      実装済み
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>招待リンクの生成・管理</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>チームの権限設定</span>
                  </div>
                </div>
              </Card>
            </div>
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

      {/* キック確認モーダル */}
      {kickConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              メンバーをキック
            </h3>
            <p className="text-gray-600 mb-6">
              <strong>{kickConfirmModal.displayName}</strong>
              をチームから削除しますか？ この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setKickConfirmModal(null)}
                className="flex-1"
                disabled={kickMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                onClick={confirmKickMember}
                disabled={kickMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {kickMutation.isPending ? "削除中..." : "削除する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
