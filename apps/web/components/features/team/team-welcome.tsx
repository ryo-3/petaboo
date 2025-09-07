"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/src/hooks/use-user";
import { useTeamStats } from "@/src/hooks/use-team-stats";
import { useTeams } from "@/src/hooks/use-teams";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeamIcon from "@/components/icons/team-icon";
import PlusIcon from "@/components/icons/plus-icon";
import { Crown } from "lucide-react";

export function TeamWelcome() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: teamStats, isLoading } = useTeamStats();
  const { data: teams, isLoading: teamsLoading } = useTeams();

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
  const canCreateTeam = actualOwnedTeams < teamStats.maxOwnedTeams && isPremium;
  const canJoinTeam = actualTotalTeams < teamStats.maxMemberTeams;

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <div className="w-full pt-3 pl-5 pr-5 flex flex-col">
        {/* ヘッダー */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-gray-800 w-[105px] truncate">
              チーム管理
            </h1>
            <button
              onClick={() => canCreateTeam && router.push("/team/create")}
              disabled={!canCreateTeam}
              className={`p-2 rounded-md transition-colors ${
                canCreateTeam
                  ? "bg-slate-500 text-white hover:bg-slate-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              title={
                canCreateTeam ? "新しいチームを作成" : "作成上限に達しています"
              }
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
            <div className="text-sm text-gray-500">
              {isPremium
                ? "チームプランではチームを作成・管理できます"
                : "フリープランでは招待されたチームに参加できます"}
            </div>
          </div>
        </div>

        {/* チーム未所属時の4ブロックレイアウト */}
        {!hasTeams ? (
          <div className="flex-1 flex flex-col gap-4 pb-6">
            {/* 上段：左右2分割 */}
            <div className="flex gap-4 h-1/2">
              {/* 左上：プレミアムプラン詳細 */}
              <div className="flex-1">
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-blue-200 p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">チームプラン</h3>
                      <p className="text-gray-600">チーム機能が利用可能</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">¥1,980</div>
                      <div className="text-sm text-gray-600">月額（税込）</div>
                      <div className="text-xs text-blue-600 font-medium">
                        1ヶ月無料トライアル
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-1 mb-3">
                    <li className="flex items-center text-lg">
                      <span className="mr-2">✓</span>
                      無制限のメモ・タスク作成
                    </li>
                    <li className="flex items-center text-lg">
                      <span className="mr-2">✓</span>
                      チーム作成・管理（1チーム）
                    </li>
                    <li className="flex items-center text-lg">
                      <span className="mr-2">✓</span>
                      ボード（プロジェクト）30個まで作成可能
                    </li>
                    <li className="flex items-center text-lg">
                      <span className="mr-2">✓</span>
                      1ヶ月無料
                    </li>
                  </ul>

                  <div className="flex justify-center mt-auto">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8"
                      onClick={() => {
                        alert("プレミアムアップグレード機能は実装予定です");
                      }}
                    >
                      <Crown className="mr-2 w-5 h-5" />
                      まずは1ヶ月無料でお試し
                    </Button>
                  </div>
                </Card>
              </div>

              {/* 右上：プレミアムプラン */}
              <div className="flex-1">
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">プレミアムプラン</h3>
                      <p className="text-gray-600">すべての機能が利用可能</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">¥4,980</div>
                      <div className="text-sm text-gray-600">月額（税込）</div>
                    </div>
                  </div>

                  <ul className="space-y-1 mb-3">
                    <li className="flex items-center text-lg">
                      <span className="mr-2">✓</span>
                      チームプランの全機能
                    </li>
                    <li className="flex items-center text-lg">
                      <span className="mr-2">✓</span>
                      複数チーム作成（最大3チーム）
                    </li>
                    <li className="flex items-center text-lg">
                      <span className="mr-2">✓</span>
                      ボード（プロジェクト）実質無制限！（999個まで）
                    </li>
                  </ul>

                  <div className="flex justify-center mt-auto">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8"
                      onClick={() => {
                        alert("プレミアムプランは準備中です");
                      }}
                    >
                      <Crown className="mr-2 w-5 h-5" />
                      準備中
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            {/* 下段：左右2分割 */}
            <div className="flex gap-4 h-1/2">
              {/* 左下：承認待ちチーム */}
              <div className="flex-1">
                <Card className="p-6 h-full border-dashed border-2 border-gray-300">
                  <h3 className="text-lg font-bold mb-4">承認待ちのチーム</h3>
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-sm">
                      現在承認待ちのチームはありません
                    </div>
                  </div>
                </Card>
              </div>

              {/* 右下：チーム開始 */}
              <div className="flex-1">
                <Card className="p-6 h-full">
                  <h3 className="text-lg font-bold mb-4">
                    チームを始めましょう！
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    招待URLで既存のチームに参加できます。
                    <br />
                    チームを作成するにはチームプランが必要です。
                  </p>
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      disabled={!isPremium}
                      variant={isPremium ? "default" : "secondary"}
                      onClick={() => isPremium && router.push("/team/create")}
                    >
                      チーム作成（チームプランのみ）
                    </Button>
                    <Button variant="outline" className="w-full">
                      招待URLで参加
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          /* チーム所属時は既存のチーム一覧表示 */
          <div className="flex-1 overflow-hidden">
            {/* チーム一覧（空の場合の表示） */}
            {!teams || !Array.isArray(teams) || teams.length === 0 ? (
              <Card className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TeamIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  チームを始めましょう！
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {isPremium
                    ? "新しいチームを作成するか、招待URLで既存のチームに参加できます。"
                    : "招待URLで既存のチームに参加できます。チームを作成するにはチームプランが必要です。"}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    className="px-8"
                    disabled={!isPremium}
                    variant={isPremium ? "default" : "secondary"}
                    onClick={() => isPremium && router.push("/team/create")}
                  >
                    {isPremium
                      ? "チームを作成"
                      : "チーム作成（チームプランのみ）"}
                  </Button>
                  <Button size="lg" variant="outline" className="px-8">
                    招待URLで参加
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="h-full overflow-y-auto">
                <h2 className="text-lg font-semibold mb-4 sticky top-0 bg-white z-10">
                  あなたのチーム ({teams.length})
                </h2>
                <div className="space-y-3">
                  {Array.isArray(teams) &&
                    teams.map((team) => (
                      <Card
                        key={team.id}
                        className="p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {team.name}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  team.role === "admin"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {team.role === "admin" ? "管理者" : "メンバー"}
                              </span>
                            </div>
                            {team.description && (
                              <p className="text-gray-600 text-sm mb-2">
                                {team.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                作成日:{" "}
                                {new Date(team.createdAt).toLocaleDateString()}
                              </span>
                              {team.memberCount && (
                                <span>メンバー: {team.memberCount}人</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(`/team/${team.customUrl}`)
                              }
                            >
                              管理画面
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
