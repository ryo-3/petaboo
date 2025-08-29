"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import TeamIcon from "@/components/icons/team-icon";
import { useTeamDetail } from "@/src/hooks/use-team-detail";

interface TeamDetailProps {
  teamId: number;
}

export function TeamDetail({ teamId }: TeamDetailProps) {
  const router = useRouter();
  const { data: team, isLoading, error } = useTeamDetail(teamId);

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

          {/* アクション */}
          <div className="flex gap-3">
            {team.role === "admin" && (
              <Button 
                onClick={() => router.push(`/team/${teamId}/settings`)}
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
                <span>メンバー一覧の表示</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>チーム専用のメモ・タスク機能</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>招待リンクの生成</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}