import { useState, useEffect } from 'react'

export function useLocalStorageSync(memoId: number, defaultTitle: string, defaultContent: string, isEditing: boolean = false) {
  const [displayTitle, setDisplayTitle] = useState(defaultTitle)
  const [displayContent, setDisplayContent] = useState(defaultContent)
  const [isLocallyEdited, setIsLocallyEdited] = useState(false)
  const [lastEditTime, setLastEditTime] = useState<number | null>(null)

  // 初期値をローカルストレージから取得
  useEffect(() => {
    const localData = localStorage.getItem(`memo_draft_${memoId}`)
    if (localData) {
      try {
        const parsed = JSON.parse(localData)
        if (parsed.id === memoId) {
          setDisplayTitle(parsed.title || defaultTitle)
          setDisplayContent(parsed.content || defaultContent)
          setIsLocallyEdited(parsed.isEditing || false)
          setLastEditTime(parsed.lastEditedAt || null)
          return
        }
      } catch {
        // パースエラーの場合はデフォルト値を使用
      }
    }
    setDisplayTitle(defaultTitle)
    setDisplayContent(defaultContent)
    setIsLocallyEdited(false)
    setLastEditTime(null)
  }, [memoId, defaultTitle, defaultContent])

  // 編集中のメモのみローカルストレージの変更を監視
  useEffect(() => {
    if (!isEditing) {
      // 編集中でないメモは初回読み込み後は監視停止（パフォーマンス向上）
      return
    }

    const updateFromLocalStorage = () => {
      const localData = localStorage.getItem(`memo_draft_${memoId}`)
      if (localData) {
        try {
          const parsed = JSON.parse(localData)
          if (parsed.id === memoId) {
            // console.log(`useLocalStorageSync update - memo ${memoId}:`, {
            //   title: parsed.title,
            //   isEditing: isEditing
            // });
            setDisplayTitle(parsed.title || defaultTitle)
            setDisplayContent(parsed.content || defaultContent)
            setIsLocallyEdited(parsed.isEditing || false)
            setLastEditTime(parsed.lastEditedAt || null)
          }
        } catch {
          // エラー時はそのまま
        }
      }
    }

    // 編集中のメモのみ1秒間隔でリアルタイム監視
    const interval = setInterval(updateFromLocalStorage, 1000)

    return () => clearInterval(interval)
  }, [memoId, defaultTitle, defaultContent, isEditing])

  return { displayTitle, displayContent, isLocallyEdited, lastEditTime }
}