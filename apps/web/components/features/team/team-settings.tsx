"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useTeamDetail } from "@/src/hooks/use-team-detail";

interface TeamSettingsProps {
  customUrl: string;
}

export function TeamSettings({ customUrl }: TeamSettingsProps) {
  const router = useRouter();
  const { data: team, isLoading } = useTeamDetail(customUrl);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
      router.push("/team");
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
    // TODO: チーム設定更新のAPI実装
    console.log("チーム設定更新:", { name, description });
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
            <h1 className="text-[22px] font-bold text-gray-800 w-[105px] truncate">チーム設定</h1>
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
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="px-6"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-8"
                >
                  設定を保存
                </Button>
              </div>
            </form>
          </Card>

          {/* 危険な操作 */}
          <Card className="max-w-xl mt-4 p-4 border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">危険な操作</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  チームを削除すると、すべてのデータが永久に失われます。この操作は取り消せません。
                </p>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(`本当に「${team.name}」を削除しますか？この操作は取り消せません。`)) {
                      // TODO: チーム削除のAPI実装
                      console.log("チーム削除:", team.id);
                    }
                  }}
                >
                  チームを削除
                </Button>
              </div>
            </div>
          </Card>

          {/* 今後の機能予定 */}
          <Card className="max-w-xl mt-4 p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">今後追加予定の機能</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>メンバーの招待・削除機能</span>
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
  );
}