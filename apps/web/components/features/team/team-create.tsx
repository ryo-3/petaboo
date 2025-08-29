"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeamIcon from "@/components/icons/team-icon";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useTeamStats } from "@/src/hooks/use-team-stats";

export function TeamCreate() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { data: teamStats } = useTeamStats();

  const canCreateTeam = teamStats ? teamStats.ownedTeams < teamStats.maxOwnedTeams : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateTeam || !name.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: チーム作成API呼び出し
      console.log("Creating team:", { name, description });
      
      // 成功後はチーム一覧に戻る
      router.push("/team");
    } catch (error) {
      console.error("チーム作成エラー:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="text-[22px] font-bold text-gray-800">新しいチームを作成</h1>
            <TeamIcon className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* フォームエリア */}
        <div className="flex-1 overflow-y-auto">
          <Card className="max-w-xl p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* チーム名 */}
              <div>
                <label htmlFor="teamName" className="block text-sm font-semibold text-gray-700 mb-2">
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
                  disabled={!canCreateTeam}
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
                <label htmlFor="teamDescription" className="block text-sm font-semibold text-gray-700 mb-2">
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
                  disabled={!canCreateTeam}
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

              {/* 制限情報 */}
              {teamStats && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-blue-800">プレミアムプラン特典</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    作成可能なチーム: {teamStats.ownedTeams}/{teamStats.maxOwnedTeams}
                  </div>
                  {!canCreateTeam && (
                    <div className="text-sm text-red-600 mt-1">
                      チーム作成数の上限に達しています
                    </div>
                  )}
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="px-6"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={!canCreateTeam || !name.trim() || isSubmitting}
                  className="px-8"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      作成中...
                    </>
                  ) : (
                    "チームを作成"
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* チーム作成後の流れ */}
          <Card className="max-w-xl mt-4 p-3 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">チーム作成後の流れ</h3>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
                <span>チームが作成され、あなたが管理者になります</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
                <span>招待コードが生成され、メンバーを招待できます</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
                <span>チーム専用のメモ・タスクを共有できます</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}