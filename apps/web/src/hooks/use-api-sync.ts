import { useEffect, useState, useCallback } from 'react'
import { useUpdateNote, useCreateNote } from './use-notes'

interface LocalMemoData {
  id: number | string
  title: string
  content: string
  lastModified: number
  lastEditedAt: number
  isEditing: boolean
}

interface SyncStatus {
  [key: string]: {
    retryCount: number
    isLoading: boolean
  }
}

export function useApiSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({})
  const [errors, setErrors] = useState<string[]>([])
  const updateNote = useUpdateNote()
  const createNote = useCreateNote()

  const syncSingleMemo = useCallback(async (storageKey: string, data: LocalMemoData) => {
    const currentRetry = syncStatus[storageKey]?.retryCount || 0
    
    // 最大3回までリトライ
    if (currentRetry >= 3) {
      setErrors(prev => [...prev, `メモ「${data.title || '無題'}」の保存に失敗しました（3回リトライ後）`])
      return
    }

    // 同期中フラグ設定
    setSyncStatus(prev => ({
      ...prev,
      [storageKey]: { retryCount: currentRetry, isLoading: true }
    }))

    try {
      const memoData = {
        title: data.title.trim(),
        content: data.content.trim() || undefined
      }

      if (typeof data.id === 'number' && data.id > 0) {
        // 既存メモの更新
        console.log('🟢 既存メモを更新:', data.id)
        await updateNote.mutateAsync({
          id: data.id,
          data: memoData
        })
      } else {
        // 新規メモの作成（idが'new'や文字列の場合など）
        console.log('🟢 新規メモを作成:', data.id)
        await createNote.mutateAsync(memoData)
      }

      // 成功：ローカルデータ削除
      localStorage.removeItem(storageKey)
      setSyncStatus(prev => {
        const newStatus = { ...prev }
        delete newStatus[storageKey]
        return newStatus
      })
      
      console.log('API保存成功、ローカルデータ削除:', data.title || '無題', storageKey)
    } catch (error: unknown) {
      console.error('API保存失敗:', error)
      
      // 404エラーの場合は新規作成として再試行
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('404') && 
          typeof data.id === 'number' && data.id > 0) {
        console.log('404エラーのため新規作成として再試行:', data.id)
        try {
          await createNote.mutateAsync(data)
          // 成功：ローカルデータ削除
          localStorage.removeItem(storageKey)
          setSyncStatus(prev => {
            const newStatus = { ...prev }
            delete newStatus[storageKey]
            return newStatus
          })
          console.log('新規作成として保存成功:', data.title || '無題')
          return
        } catch (createError) {
          console.error('新規作成も失敗:', createError)
          // 新規作成も失敗した場合はローディングフラグをリセット
          setSyncStatus(prev => ({
            ...prev,
            [storageKey]: { retryCount: currentRetry + 1, isLoading: false }
          }))
          return
        }
      }
      
      console.error('メモデータ:', data)
      console.error('メモID:', data.id, 'typeof:', typeof data.id)
      
      // リトライカウント増加
      setSyncStatus(prev => ({
        ...prev,
        [storageKey]: { retryCount: currentRetry + 1, isLoading: false }
      }))
    }
  }, [updateNote, createNote, syncStatus, setSyncStatus, setErrors])

  useEffect(() => {
    const checkAndSync = () => {
      const now = Math.floor(Date.now() / 1000)
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('memo_draft_')) {
          try {
            const data: LocalMemoData = JSON.parse(localStorage.getItem(key) || '{}')
            
            // 最後の編集から1秒経過しているかチェック
            if (data.lastEditedAt && (now - data.lastEditedAt) >= 1) {
              // 現在同期中でない場合のみ実行
              if (!syncStatus[key]?.isLoading) {
                console.log('🔄 同期開始:', key, 'lastEditedAt:', data.lastEditedAt, 'now:', now)
                syncSingleMemo(key, data)
              } else {
                console.log('同期中のためスキップ:', key)
              }
            }
          } catch (error) {
            console.error('ローカルデータの解析に失敗:', key, error)
            // 破損したデータは削除
            localStorage.removeItem(key)
          }
        }
      })
    }

    // 1秒間隔でチェック
    const interval = setInterval(checkAndSync, 1000)

    return () => clearInterval(interval)
  }, [syncStatus, updateNote, createNote, syncSingleMemo])

  // エラーをクリアする関数
  const clearErrors = () => setErrors([])

  return {
    errors,
    clearErrors,
    syncStatus
  }
}