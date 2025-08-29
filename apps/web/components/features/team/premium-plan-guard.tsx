"use client";

import { useAuth } from "@clerk/nextjs";
import { useUser } from "@/src/hooks/use-user";
import { PremiumUpgradePrompt } from "./premium-upgrade-prompt";

interface PremiumPlanGuardProps {
  children: React.ReactNode;
}

export function PremiumPlanGuard({ children }: PremiumPlanGuardProps) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { data: userInfo, isLoading: userLoading } = useUser();

  // 認証情報の読み込み中
  if (!authLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // ログインチェック
  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">ログインが必要です</p>
      </div>
    );
  }

  // ユーザー情報の読み込み中
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">プラン情報を確認中...</div>
      </div>
    );
  }

  // プレミアムプランチェック
  if (userInfo?.planType !== "premium") {
    return <PremiumUpgradePrompt />;
  }

  // プレミアムユーザーは子コンポーネントを表示
  return <>{children}</>;
}