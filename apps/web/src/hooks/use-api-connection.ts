import { useState, useEffect, useCallback } from 'react'

export interface ApiConnectionState {
  isOnline: boolean
  isAirplaneMode: boolean
  lastConnectionCheck: Date | null
  connectionError: string | null
}

export function useApiConnection() {
  const [state, setState] = useState<ApiConnectionState>({
    isOnline: false,
    isAirplaneMode: false,
    lastConnectionCheck: null,
    connectionError: null
  })

  // API接続テスト
  const checkConnection = useCallback(async () => {
    // 機内モードの場合はチェックしない
    if (state.isAirplaneMode) {
      setState(prev => ({
        ...prev,
        isOnline: false,
        lastConnectionCheck: new Date(),
        connectionError: null
      }))
      return false
    }

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
  }, [state.isAirplaneMode])

  // 機内モード切り替え
  const toggleAirplaneMode = useCallback(() => {
    setState(prev => {
      const newAirplaneMode = !prev.isAirplaneMode
      
      // 機内モードをlocalStorageに保存
      localStorage.setItem('airplaneMode', newAirplaneMode.toString())
      
      return {
        ...prev,
        isAirplaneMode: newAirplaneMode,
        isOnline: newAirplaneMode ? false : prev.isOnline
      }
    })
  }, [])

  // 初期化時に機内モード設定を読み込み
  useEffect(() => {
    const savedAirplaneMode = localStorage.getItem('airplaneMode')
    if (savedAirplaneMode === 'true') {
      setState(prev => ({
        ...prev,
        isAirplaneMode: true,
        isOnline: false
      }))
    }
  }, [])

  // 定期的な接続チェック（機内モードでない場合のみ）
  useEffect(() => {
    if (state.isAirplaneMode) return

    // 初回チェック
    checkConnection()

    // 30秒ごとにチェック
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [checkConnection, state.isAirplaneMode])

  return {
    ...state,
    checkConnection,
    toggleAirplaneMode
  }
}