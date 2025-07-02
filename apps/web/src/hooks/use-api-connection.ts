import { useState, useEffect, useCallback } from 'react'

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

  // API接続テスト
  const checkConnection = useCallback(async () => {

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8794'
      const response = await fetch(`${API_BASE}/notes`, {
        method: 'HEAD', // HEADリクエストで軽量チェック
        headers: {
          'Accept': 'application/json'
        }
      })
      
      const isConnected = response.ok
      setState(prev => ({
        ...prev,
        isOnline: isConnected,
        lastConnectionCheck: new Date(),
        connectionError: isConnected ? null : `HTTP ${response.status}`
      }))
      
      return isConnected
    } catch (error) {
      console.warn('API接続チェック失敗:', error)
      setState(prev => ({
        ...prev,
        isOnline: false,
        lastConnectionCheck: new Date(),
        connectionError: error instanceof Error ? error.message : 'Connection failed'
      }))
      
      return false
    }
  }, [])

  // オンライン/オフライン強制切り替え
  const toggleOnlineMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnline: !prev.isOnline,
      connectionError: prev.isOnline ? 'Manual offline mode' : null
    }))
  }, [])

  // 定期的な接続チェック
  useEffect(() => {
    // 初回チェック
    checkConnection()

    // 30秒ごとにチェック
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [checkConnection])

  return {
    ...state,
    checkConnection,
    toggleOnlineMode
  }
}