"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/src/hooks/use-user";
import { useTeamStats } from "@/src/hooks/use-team-stats";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeamIcon from "@/components/icons/team-icon";
import PlusIcon from "@/components/icons/plus-icon";

export function TeamWelcome() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: teamStats, isLoading } = useTeamStats();

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

  if (!teamStats) {
    return (
      <div className="flex h-full bg-white overflow-hidden">
        <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
          <div className="text-center text-gray-500">
            チーム統計情報を読み込めませんでした。
          </div>
        </div>
      </div>
    );
  }

  const canCreateTeam = teamStats.ownedTeams < teamStats.maxOwnedTeams;
  const canJoinTeam = teamStats.memberTeams < teamStats.maxMemberTeams;

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <div className="w-full pt-3 pl-5 pr-2 flex flex-col">
        {/* ヘッダー */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-gray-800 w-[105px] truncate">チーム管理</h1>
            <button
              onClick={() => canCreateTeam && router.push("/team/create")}
              disabled={!canCreateTeam}
              className={`p-2 rounded-md transition-colors ${
                canCreateTeam
                  ? "bg-slate-500 text-white hover:bg-slate-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              title={canCreateTeam ? "新しいチームを作成" : "作成上限に達しています"}
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
            <div className="text-sm text-gray-500">
              プレミアムプランでは最大3つのチームを作成・管理できます
            </div>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-hidden">
          {/* プレミアムプラン特典の説明 */}
          <Card className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-center mb-3">
              <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold mr-2">
                PREMIUM
              </div>
              <h2 className="text-lg font-semibold">プレミアムプラン特典</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                <span>最大3つのチーム作成</span>
              </div>
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                <span>最大3つのチームに参加</span>
              </div>
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                <span>無制限のメモとタスク</span>
              </div>
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                <span>高度なコラボレーション機能</span>
              </div>
            </div>
          </Card>

          {/* 現在の利用状況 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="p-3">
              <h3 className="text-sm font-semibold mb-2">作成したチーム</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-blue-600">
                  {teamStats.ownedTeams}
                </span>
                <span className="text-gray-500 text-sm">/ {teamStats.maxOwnedTeams}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(teamStats.ownedTeams / teamStats.maxOwnedTeams) * 100}%` 
                  }}
                ></div>
              </div>
              <Button 
                className="w-full text-xs h-8" 
                disabled={!canCreateTeam}
                variant={canCreateTeam ? "default" : "secondary"}
                onClick={() => canCreateTeam && router.push("/team/create")}
              >
                {canCreateTeam ? "新しいチームを作成" : "作成上限に達しました"}
              </Button>
            </Card>

            <Card className="p-3">
              <h3 className="text-sm font-semibold mb-2">参加しているチーム</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-green-600">
                  {teamStats.memberTeams}
                </span>
                <span className="text-gray-500 text-sm">/ {teamStats.maxMemberTeams}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                <div 
                  className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(teamStats.memberTeams / teamStats.maxMemberTeams) * 100}%` 
                  }}
                ></div>
              </div>
              <Button 
                className="w-full text-xs h-8" 
                disabled={!canJoinTeam}
                variant={canJoinTeam ? "default" : "secondary"}
              >
                {canJoinTeam ? "招待コードで参加" : "参加上限に達しました"}
              </Button>
            </Card>
          </div>

          {/* チーム一覧（空の場合の表示） */}
          {teamStats.ownedTeams === 0 && teamStats.memberTeams === 0 ? (
            <Card className="p-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TeamIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">チームを始めましょう！</h3>
                <p className="text-gray-600 mb-6">
                  新しいチームを作成するか、招待コードで既存のチームに参加できます。
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    size="lg" 
                    className="px-8"
                    onClick={() => router.push("/team/create")}
                  >
                    チームを作成
                  </Button>
                  <Button size="lg" variant="outline" className="px-8">
                    招待コードで参加
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div>
              {/* TODO: 実際のチーム一覧を表示 */}
              <h2 className="text-lg font-semibold mb-2">あなたのチーム</h2>
              <div className="text-gray-500 text-sm">チーム一覧の実装が必要です。</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}