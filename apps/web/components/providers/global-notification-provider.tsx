"use client";

import { useAuth } from "@clerk/nextjs";

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

  console.log(
    "🌐 GlobalNotificationProvider rendered, isSignedIn:",
    isSignedIn,
  );

  // グローバル通知は一時的に無効化

  return <>{children}</>;
}
