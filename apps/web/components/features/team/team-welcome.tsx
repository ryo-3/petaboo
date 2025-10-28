"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/src/hooks/use-user";
import { useTeamStats } from "@/src/hooks/use-team-stats";
import { useTeams } from "@/src/hooks/use-teams";
import { useJoinRequests } from "@/src/hooks/use-join-requests";
import { useMyJoinRequests } from "@/src/hooks/use-my-join-requests";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeamIcon from "@/components/icons/team-icon";
import PlusIcon from "@/components/icons/plus-icon";
import { Crown, Clock, Users } from "lucide-react";
import { TeamCreateInline } from "./team-create-inline";

interface TeamWelcomeProps {
  onTeamCreate?: () => void;
}

export function TeamWelcome({ onTeamCreate }: TeamWelcomeProps = {}) {
  const router = useRouter();
  const { data: user } = useUser();

  // パネル切り替え用state
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "teams">("requests");
  const [showInviteUrlDialog, setShowInviteUrlDialog] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: teamStats, isLoading } = useTeamStats();
  const { data: teams, isLoading: teamsLoading } = useTeams();

  // 管理者として所属しているチームの承認待ちリストを取得
  const adminTeams = teams?.filter((team) => team.role === "admin") || [];
  const firstAdminTeam = adminTeams[0];
  const { data: joinRequests } = useJoinRequests(firstAdminTeam?.customUrl);

  // 自分の申請状況を取得
  const { data: myJoinRequests } = useMyJoinRequests();

  // リアルタイム更新用ポーリング（ホーム画面でチームアイコンがアクティブな場合のみ）
  // 注意：チーム詳細ページではすでにTeamDetailコンポーネントでポーリングを実行しているため、
  // ホーム画面（/）でのみポーリングを実行する
  const isHomePage =
    typeof window !== "undefined" && window.location.pathname === "/";

  if (isLoading || teamsLoading) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-5 flex flex-col">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!teamStats) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-5 flex flex-col">
          <div className="text-center text-gray-500">
            チーム統計情報を読み込めませんでした。
          </div>
        </div>
      </div>
    );
  }

  // チーム一覧から実際の統計を計算
  const actualOwnedTeams =
    teams?.filter((team) => team.role === "admin").length || 0;
  const actualTotalTeams = teams?.length || 0;

  // チーム所属判定
  const hasTeams = actualTotalTeams > 0;

  const isPremium = user?.planType === "premium";
  const canCreateTeam = actualOwnedTeams < teamStats.maxOwnedTeams;
  const canJoinTeam = actualTotalTeams < teamStats.maxMemberTeams;

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <div className="w-full pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2 flex flex-col">
        {/* ヘッダー - チーム作成フォーム表示時は非表示 */}
        {!showCreateForm && (
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold text-gray-800 w-[105px] truncate">
                チーム一覧
              </h1>
              <button
                onClick={() => setShowActionModal(true)}
                className="p-2 rounded-md transition-colors bg-slate-500 text-white hover:bg-slate-600"
                title="チーム作成・参加"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
              <div className="text-sm text-gray-500 hidden md:block">
                {isPremium
                  ? "チームプランではチームを作成・管理できます"
                  : "フリープランでは招待されたチームに参加できます"}
              </div>
            </div>
          </div>
        )}

        {/* 詳細ビュー表示時 */}
        {showDetailedView && !hasTeams ? (
          <div className="flex-1 p-6">
            <Card className="p-6 h-full">
              {/* 戻るボタン */}
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailedView(false)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  ← 戻る
                </Button>
                <h3 className="text-[22px] font-bold">申請・参加状況</h3>
              </div>

              {/* タブ切り替え */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setActiveTab("requests")}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "requests"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  申請状況
                </button>
                <button
                  onClick={() => setActiveTab("teams")}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "teams"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  参加チーム
                </button>
              </div>

              {/* タブ内容 */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === "requests" ? (
                  <div className="space-y-4">
                    {!myJoinRequests ||
                    !myJoinRequests.requests ||
                    myJoinRequests.requests.length === 0 ? (
                      <div className="text-center text-gray-500 py-12">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <div className="text-lg">
                          申請したチームはありません
                        </div>
                      </div>
                    ) : (
                      myJoinRequests.requests.map((request) => (
                        <div
                          key={request.id}
                          className={`border rounded-lg p-4 ${
                            request.status === "pending"
                              ? "bg-blue-50 border-blue-200"
                              : request.status === "approved"
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Users
                                  className={`w-5 h-5 ${
                                    request.status === "pending"
                                      ? "text-blue-600"
                                      : request.status === "approved"
                                        ? "text-green-600"
                                        : "text-red-600"
                                  }`}
                                />
                                <span className="font-semibold text-base text-gray-900">
                                  {request.teamName}
                                </span>
                                <span
                                  className={`text-sm px-3 py-1 rounded-full font-medium ${
                                    request.status === "pending"
                                      ? "bg-blue-100 text-blue-800"
                                      : request.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {request.status === "pending"
                                    ? "承認待ち"
                                    : request.status === "approved"
                                      ? "承認済み"
                                      : "拒否済み"}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>
                                  申請日:{" "}
                                  {new Date(
                                    request.createdAt * 1000,
                                  ).toLocaleDateString("ja-JP", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                                {request.processedAt && (
                                  <div>
                                    {request.status === "approved"
                                      ? "承認"
                                      : "拒否"}
                                    日:{" "}
                                    {new Date(
                                      request.processedAt * 1000,
                                    ).toLocaleDateString("ja-JP", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                )}
                                {request.message && (
                                  <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-3">
                                    メッセージ: {request.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!myJoinRequests || !myJoinRequests.requests ? (
                      <div className="text-center text-gray-500 py-12">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <div className="text-lg">
                          参加中のチームはありません
                        </div>
                      </div>
                    ) : (
                      myJoinRequests.requests
                        .filter((r) => r.status === "approved")
                        .map((request) => (
                          <div
                            key={request.id}
                            className="border rounded-lg p-4 bg-green-50 border-green-200"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <Users className="w-5 h-5 text-green-600" />
                              <span className="font-semibold text-base text-gray-900">
                                {request.teamName}
                              </span>
                              <span className="text-sm px-3 py-1 rounded-full font-medium bg-green-100 text-green-800">
                                参加中
                              </span>
                            </div>
                            {request.processedAt && (
                              <div className="text-sm text-gray-600">
                                参加日:{" "}
                                {new Date(
                                  request.processedAt * 1000,
                                ).toLocaleDateString("ja-JP", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            )}
                          </div>
                        ))
                    )}
                    {myJoinRequests &&
                      myJoinRequests.requests &&
                      myJoinRequests.requests.filter(
                        (r) => r.status === "approved",
                      ).length === 0 && (
                        <div className="text-center text-gray-500 py-12">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <div className="text-lg">
                            参加中のチームはありません
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        ) : showCreateForm ? (
          /* チーム作成フォーム */
          <div className="flex-1 pb-12">
            <TeamCreateInline
              onCancel={() => setShowCreateForm(false)}
              onSuccess={() => {
                setShowCreateForm(false);
                window.location.reload(); // チーム一覧を更新
              }}
            />
          </div>
        ) : !showDetailedView ? (
          /* 標準の2パネルレイアウト（PC: 横並び / スマホ: 縦並び） */
          <div className="flex-1 overflow-auto pr-2 pb-10 mb-2">
            <div className="flex flex-col gap-4">
              {/* 2分割レイアウト */}
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                {/* 左：所属チーム一覧 */}
                <div className="flex-1 md:min-h-0 min-h-[300px]">
                  <Card className="p-4 md:p-6 h-full flex flex-col">
                    <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">
                      所属チーム
                    </h3>
                    {!teams || teams.length === 0 ? (
                      <div className="text-center text-gray-500 py-6 md:py-8">
                        <TeamIcon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-xs md:text-sm">
                          所属しているチームはありません
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 md:space-y-3 overflow-auto flex-1">
                        {teams.map((team) => (
                          <div
                            key={team.id}
                            className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(`/team/${team.customUrl}`)
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <TeamIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <span className="font-medium text-sm text-gray-900 truncate">
                                    {team.name}
                                  </span>
                                  {team.role === "admin" && (
                                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                      管理者
                                    </span>
                                  )}
                                </div>
                                {team.description && (
                                  <div className="text-xs text-gray-600 truncate">
                                    {team.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* 右：申請状況 */}
                <div className="flex-1 md:min-h-0 min-h-[300px]">
                  <Card className="p-4 md:p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <h3 className="text-base md:text-lg font-bold">
                        申請状況
                      </h3>
                      {myJoinRequests &&
                        myJoinRequests.requests.filter(
                          (r) => r.status !== "approved", // 承認済みを除外
                        ).length > 0 && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {
                              myJoinRequests.requests.filter(
                                (r) => r.status !== "approved", // 承認済みを除外
                              ).length
                            }
                            件
                          </span>
                        )}
                    </div>

                    {!myJoinRequests ||
                    !myJoinRequests.requests ||
                    myJoinRequests.requests.filter(
                      (r) => r.status !== "approved",
                    ).length === 0 ? ( // 承認済みを除外
                      <div className="text-center text-gray-500 py-6 md:py-8">
                        <Clock className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-xs md:text-sm">
                          申請したチームはありません
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 md:space-y-3 overflow-auto flex-1">
                        {myJoinRequests.requests
                          .filter((r) => r.status !== "approved") // 承認済みを除外
                          .map((request) => (
                            <div
                              key={request.id}
                              className={`border rounded-lg p-3 ${
                                request.status === "pending"
                                  ? "bg-blue-50 border-blue-200"
                                  : request.status === "approved"
                                    ? "bg-green-50 border-green-200"
                                    : "bg-red-50 border-red-200"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Users
                                      className={`w-4 h-4 flex-shrink-0 ${
                                        request.status === "pending"
                                          ? "text-blue-600"
                                          : request.status === "approved"
                                            ? "text-green-600"
                                            : "text-red-600"
                                      }`}
                                    />
                                    <span className="font-medium text-sm text-gray-900 truncate">
                                      {request.teamName}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                                        request.status === "pending"
                                          ? "bg-blue-100 text-blue-800"
                                          : request.status === "approved"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {request.status === "pending"
                                        ? "承認待ち"
                                        : request.status === "approved"
                                          ? "承認済み"
                                          : "拒否済み"}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    申請日:{" "}
                                    {new Date(
                                      request.createdAt * 1000,
                                    ).toLocaleDateString("ja-JP", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* アクション選択モーダル */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">チーム機能</h3>
              <button
                onClick={() => setShowActionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* 新規作成 */}
              <button
                onClick={() => {
                  setShowActionModal(false);
                  if (isPremium && onTeamCreate) {
                    onTeamCreate();
                  }
                }}
                disabled={!isPremium}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  isPremium
                    ? "border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                    : "border-gray-200 bg-gray-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${isPremium ? "bg-blue-100" : "bg-gray-200"}`}
                  >
                    <svg
                      className={`w-5 h-5 ${isPremium ? "text-blue-600" : "text-gray-400"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`font-medium ${isPremium ? "text-gray-900" : "text-gray-400"}`}
                    >
                      新しいチームを作成
                      {!isPremium && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          プレミアム限定
                        </span>
                      )}
                    </h4>
                    <p
                      className={`text-sm mt-1 ${isPremium ? "text-gray-600" : "text-gray-400"}`}
                    >
                      自分のチームを作成して管理者として運営
                    </p>
                  </div>
                </div>
              </button>

              {/* URL入力 */}
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setShowInviteUrlDialog(true);
                }}
                className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">招待URLで参加</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      招待URLを入力して既存のチームに参加
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 招待URLダイアログ */}
      {showInviteUrlDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">招待URLで参加</h3>
              <button
                onClick={() => setShowInviteUrlDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="inviteUrl"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  招待URL
                </label>
                <input
                  id="inviteUrl"
                  type="text"
                  value={inviteUrl}
                  onChange={(e) => setInviteUrl(e.target.value)}
                  placeholder="https://example.com/join/teamname?token=..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteUrlDialog(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => {
                    if (inviteUrl.trim()) {
                      window.location.href = inviteUrl.trim();
                    }
                  }}
                  disabled={!inviteUrl.trim()}
                >
                  参加する
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
