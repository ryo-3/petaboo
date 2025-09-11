"use client";

import { useAuth } from "@clerk/nextjs";
import { useGlobalTeamNotifications } from "@/src/hooks/use-global-team-notifications";

interface GlobalNotificationProviderProps {
  children: React.ReactNode;
}

/**
 * グローバル通知プロバイダー
 * アプリケーション全体でバックグラウンド通知を管理
 */
export default function GlobalNotificationProvider({
  children,
}: GlobalNotificationProviderProps) {
  const { isSignedIn } = useAuth();

  // 認証済みユーザーのみグローバル通知を有効化
  useGlobalTeamNotifications();

  console.log(
    "🌐 GlobalNotificationProvider initialized, isSignedIn:",
    isSignedIn,
  );

  return <>{children}</>;
}
