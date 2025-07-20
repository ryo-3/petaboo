'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,     // 5分間は新鮮なデータとして扱う
            gcTime: 30 * 60 * 1000,       // 30分間キャッシュを保持
            refetchOnWindowFocus: false,  // ウィンドウフォーカス時の再取得を無効化
            refetchOnMount: true,         // マウント時の再取得（必要時のみ）
            refetchOnReconnect: true,     // 再接続時の再取得（必要時のみ）
            retry: 2,                     // 失敗時のリトライ回数を制限
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}