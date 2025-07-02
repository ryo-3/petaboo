import { useState, useCallback } from 'react'

export interface ApiConnectionState {
  isOnline: boolean
  lastConnectionCheck: Date | null
  connectionError: string | null
}

export function useApiConnection() {
  const [state, setState] = useState<ApiConnectionState>({
    isOnline: true, // 初期値をtrueに（楽観的）
    lastConnectionCheck: null,
    connectionError: null
  })

  // API接続テスト（手動オフライン時は実行しない）
  const checkConnection = useCallback(async () => {
    // 手動オフラインモードの場合は何もしない
    if (!state.isOnline && state.connectionError === 'Manual offline mode') {
      return false
    }

    // 実際の接続チェックは削除（認証が必要なため）
    // 手動切り替えのみに対応
    return state.isOnline
  }, [state.isOnline, state.connectionError])

  // オンライン/オフライン強制切り替え
  const toggleOnlineMode = useCallback(() => {
    setState(prev => {
      const newOnlineState = !prev.isOnline
      console.log(`🔄 接続モード変更: ${prev.isOnline ? 'オンライン' : 'オフライン'} → ${newOnlineState ? 'オンライン' : 'オフライン'}`)
      
      return {
        ...prev,
        isOnline: newOnlineState,
        connectionError: newOnlineState ? null : 'Manual offline mode'
      }
    })
  }, [])

  // 定期チェックは無効化（手動切り替えのみ）
  // useEffect(() => {
  //   checkConnection()
  //   const interval = setInterval(checkConnection, 30000)
  //   return () => clearInterval(interval)
  // }, [checkConnection])

  return {
    ...state,
    checkConnection,
    toggleOnlineMode
  }
}