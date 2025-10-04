"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface QueryError extends Error {
  status?: number;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const router = useRouter();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 60 * 1000, // 30分間は新鮮なデータとして扱う（キャッシュから高速表示）
            cacheTime: 30 * 60 * 1000, // 30分間キャッシュを保持
            refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
            refetchOnMount: false, // マウント時の再取得を無効化（staleTimeで制御）
            refetchOnReconnect: true, // 再接続時の再取得（必要時のみ）
            retry: (failureCount, error) => {
              const queryError = error as QueryError;

              // 401エラーの場合はリトライしない
              const is401Error =
                queryError?.message?.includes("401") ||
                queryError?.message?.includes("Unauthorized") ||
                queryError?.status === 401;

              if (is401Error) {
                // 非同期でログアウトとリダイレクトを実行
                setTimeout(async () => {
                  await signOut();
                  router.push("/");
                }, 100);
                return false;
              }
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
