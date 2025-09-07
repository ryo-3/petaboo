"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Users,
  FileText,
  CheckSquare,
  Layout,
  Crown,
  ArrowRight,
} from "lucide-react";

export function TeamIntroCard() {
  return (
    <div className="space-y-4">
      {/* メインメッセージ */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            チームでもっと効率的に！
          </h2>
          <p className="text-gray-600 text-sm">
            メモ・タスク・ボードをチームみんなで
            <br />
            リアルタイム共有・管理できます
          </p>
        </div>

        {/* 機能紹介 */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
            <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">共有メモ</div>
              <div className="text-xs text-gray-500">
                アイデアや議事録をチームで共有
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
            <CheckSquare className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">チームタスク</div>
              <div className="text-xs text-gray-500">
                進捗状況をリアルタイムで把握
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
            <Layout className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">プロジェクトボード</div>
              <div className="text-xs text-gray-500">
                プロジェクト全体を見える化
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* プラン案内 */}
      <Card className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <div className="flex items-center gap-3 mb-3">
          <Crown className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-800">プレミアムプラン</h3>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-orange-600">¥1,980</span>
            <span className="text-sm text-gray-500">/ 月</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• チーム作成・管理機能</div>
            <div>• 最大50プロジェクト作成</div>
            <div>• 無制限メモ・タスク</div>
            <div>• 優先サポート</div>
          </div>
        </div>

        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => {
            // TODO: プレミアムアップグレードページへ
            alert("プレミアムアップグレード機能は実装予定です");
          }}
        >
          <Crown className="mr-2 w-4 h-4" />
          プレミアムでチーム作成
        </Button>
      </Card>

      {/* 参加案内 */}
      <Card className="p-4 border-dashed border-2 border-gray-300">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-700 mb-2">
            既にチームに招待されていますか？
          </div>
          <p className="text-xs text-gray-500 mb-3">
            招待URLをお持ちの方は無料でチーム参加できます
          </p>
          <Button variant="outline" className="w-full">
            <ArrowRight className="mr-2 w-4 h-4" />
            招待URLで参加
          </Button>
        </div>
      </Card>
    </div>
  );
}
