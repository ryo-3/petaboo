"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import TeamIcon from "@/components/icons/team-icon";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import { useInviteToTeam } from "@/src/hooks/use-invite-to-team";

interface TeamDetailProps {
  teamId: number;
}

export function TeamDetail({ teamId }: TeamDetailProps) {
  const router = useRouter();
  const { data: team, isLoading, error } = useTeamDetail(teamId);
  const { mutate: inviteToTeam, isPending: isInviting } = useInviteToTeam();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteMessage, setInviteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  if (error || !team) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
          <div className="text-center text-gray-500">
            チーム情報を読み込めませんでした。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <div className="w-full pt-3 pl-5 pr-5 flex flex-col">
        {/* ヘッダー */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1 text-gray-600 hover:text-gray-800 transition-colors rounded-md hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-bold text-gray-800 w-[105px] truncate">チーム詳細</h1>
            <TeamIcon className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto">
          {/* チーム基本情報 */}
          <Card className="p-6 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{team.name}</h2>
                  <span 
                    className={`px-3 py-1 text-sm rounded-full font-medium ${
                      team.role === "admin" 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {team.role === "admin" ? "管理者" : "メンバー"}
                  </span>
                </div>
                {team.description && (
                  <p className="text-gray-600 mb-4">{team.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">作成日:</span>
                <span className="ml-2">{new Date(team.createdAt * 1000).toLocaleDateString('ja-JP')}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">メンバー数:</span>
                <span className="ml-2">{team.memberCount}人</span>
              </div>
            </div>
          </Card>

          {/* メンバー一覧 */}
          <Card className="p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">メンバー ({team.memberCount}人)</h3>
              {team.role === "admin" && (
                <Button
                  onClick={() => {
                    // TODO: 招待モーダルを開く
                    console.log("招待機能を開く");
                  }}
                  className="px-4"
                >
                  メンバーを招待
                </Button>
              )}
            </div>
            
            {/* メンバー一覧（仮データ） */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    Y
                  </div>
                  <div>
                    <div className="font-medium">あなた</div>
                    <div className="text-sm text-gray-500">user@example.com</div>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                  {team.role === "admin" ? "管理者" : "メンバー"}
                </span>
              </div>
              
              {/* 他のメンバーは今後API実装時に追加 */}
              <div className="text-center py-4 text-gray-500 text-sm">
                メンバー一覧の詳細実装は今後追加予定
              </div>
            </div>
          </Card>

          {/* 招待リンク（管理者のみ） */}
          {team.role === "admin" && (
            <Card className="p-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">メンバーを招待</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メール招待
                </label>
                {inviteMessage && (
                  <div className={`mb-3 p-3 rounded-lg text-sm ${
                    inviteMessage.type === "success" 
                      ? "bg-green-100 text-green-800 border border-green-200" 
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {inviteMessage.text}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="member">メンバー</option>
                      <option value="admin">管理者</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!inviteEmail || !inviteEmail.includes("@")) {
                        setInviteMessage({ type: "error", text: "有効なメールアドレスを入力してください" });
                        return;
                      }
                      
                      inviteToTeam(
                        { teamId, email: inviteEmail, role: inviteRole },
                        {
                          onSuccess: () => {
                            setInviteMessage({ type: "success", text: `${inviteEmail} に招待メールを送信しました` });
                            setInviteEmail("");
                            setTimeout(() => setInviteMessage(null), 5000);
                          },
                          onError: (error) => {
                            const message = error instanceof Error ? error.message : "招待の送信に失敗しました";
                            setInviteMessage({ type: "error", text: message });
                            setTimeout(() => setInviteMessage(null), 5000);
                          },
                        }
                      );
                    }}
                    disabled={isInviting || !inviteEmail}
                    className="w-full"
                  >
                    {isInviting ? "送信中..." : "招待送信"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* アクション */}
          <div className="flex gap-3">
            {team.role === "admin" && (
              <Button 
                onClick={() => router.push(`/team/${teamId}/settings`)}
                variant="outline"
                className="px-6"
              >
                チーム設定
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => router.push("/team")}
              className="px-6"
            >
              チーム一覧に戻る
            </Button>
          </div>

          {/* 今後の機能予定 */}
          <Card className="mt-4 p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">今後追加予定の機能</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>実際のメンバー一覧API連携</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>招待リンクの生成・管理機能</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>メール招待システム</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>チーム専用のメモ・タスク機能</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}