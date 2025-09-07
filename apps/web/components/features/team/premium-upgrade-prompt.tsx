"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Crown, Users, Sparkles, Shield, Zap, TrendingUp } from "lucide-react";

export function PremiumUpgradePrompt() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full shadow-xl">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-4">
            <Crown className="w-16 h-16 text-yellow-500" />
          </div>
          <CardTitle className="text-3xl font-bold mb-2">
            チーム作成・管理機能を解放しよう！
          </CardTitle>
          <CardDescription className="text-lg">
            プレミアムプランで自分のチームを作成・管理できます。1ヶ月無料でお試しいただけます。
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* 特典一覧 */}
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="チームコラボレーション"
              description="メモ・タスク・ボードをチームで共有・管理"
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8 text-purple-500" />}
              title="プロジェクト管理"
              description="ボード機能で複数のプロジェクトを整理・管理"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-green-500" />}
              title="セキュアな共有"
              description="チーム専用のプライベート空間でデータを安全に管理"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-orange-500" />}
              title="メンバー管理機能"
              description="メンバー招待・権限設定でチームを効率的に運営"
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8 text-indigo-500" />}
              title="大容量ストレージ"
              description="たくさんのメモ・タスク・プロジェクトを安心して保存"
            />
            <FeatureCard
              icon={<Crown className="w-8 h-8 text-yellow-500" />}
              title="プレミアムサポート"
              description="プレミアムプランならではのアップデート順次追加予定"
            />
          </div>

          {/* プラン詳細 */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">プレミアムプラン</h3>
                <p className="text-gray-600">すべての機能が利用可能</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">¥1,980</div>
                <div className="text-sm text-gray-600">月額（税込）</div>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-sm">
                <span className="mr-2">✓</span>
                無制限のメモ・タスク作成
              </li>
              <li className="flex items-center text-sm">
                <span className="mr-2">✓</span>
                チーム作成・管理（最大50プロジェクト）
              </li>
              <li className="flex items-center text-sm">
                <span className="mr-2">✓</span>
                高度な検索・フィルター機能
              </li>
              <li className="flex items-center text-sm">
                <span className="mr-2">✓</span>
                データエクスポート機能
              </li>
              <li className="flex items-center text-sm">
                <span className="mr-2">✓</span>
                優先サポート
              </li>
            </ul>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8"
                onClick={() => {
                  // TODO: 支払いページへのリダイレクト
                  alert("支払いページへの実装は別途必要です");
                }}
              >
                <Crown className="mr-2 w-5 h-5" />
                プレミアムプランにアップグレード
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => (window.location.href = "/")}
              >
                ホームに戻る
              </Button>
            </div>
          </div>

          {/* 補足情報 */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>いつでもキャンセル可能 • 1ヶ月無料トライアル付き</p>
            <p className="mt-1">
              ご質問がある場合は、サポートまでお問い合わせください
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}
