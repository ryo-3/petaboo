import { useEffect, useRef, useState, useCallback } from 'react'
import type { Memo } from '@/src/types/memo'
import { useApiConnection } from '@/src/hooks/use-api-connection'
import { useCreateNote, useUpdateNote } from '@/src/hooks/use-notes'

interface UseMemoFormOptions {
  memo?: Memo | null
}

export function useMemoForm({ memo = null }: UseMemoFormOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || '')
  const [content, setContent] = useState(() => memo?.content || '')
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  // ローカル表示用のクライアント生成ID（API送信には使わない）
  const [clientGeneratedId] = useState(() => 
    memo?.id || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)
  )
  const [createdMemoId, setCreatedMemoId] = useState<number | null>(memo?.id || null)
  const [apiMemoId, setApiMemoId] = useState<number | null>(memo?.id || null)
  const [tempId] = useState(() => `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [hasUserEdited, setHasUserEdited] = useState(false)
  const [lastEditedAt, setLastEditedAt] = useState<number>(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // オンライン/オフライン状態取得
  const { isOnline } = useApiConnection()
  
  // API操作フック
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  
  // 保存状態管理
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const isEditMode = Boolean(memo)

  // memoが変更された時にstateを更新（新しいメモに切り替わった場合）
  useEffect(() => {
    if (memo && memo.id !== createdMemoId) {
      setTitle(memo.title || '')
      setContent(memo.content || '')
      setCreatedMemoId(memo.id)
      setHasUserEdited(false) // 新しいメモに切り替わった時はリセット
    }
  }, [memo, createdMemoId])

  // 保存処理（オンライン/オフライン分岐）
  const handleSave = useCallback(async () => {
    if (isOnline) {
      console.log('🟢 オンライン時の保存処理:', title.trim() || '(無題)')
      
      // 空の場合は保存しない
      if (!title.trim() && !content.trim()) {
        return
      }
      
      setIsSaving(true)
      setSaveError(null)
      
      try {
        const memoData = {
          title: title.trim(),
          content: content.trim() || undefined
        }
        
        if (apiMemoId) {
          // 既存メモの更新（初期メモまたは作成済みメモ）
          console.log('🔄 メモ更新 API ID:', apiMemoId)
          await updateNote.mutateAsync({
            id: apiMemoId,
            data: memoData
          })
        } else {
          // 新規メモの作成（最初の1回のみ）
          console.log('🆕 新規メモ作成 ローカルID:', clientGeneratedId)
          const result = await createNote.mutateAsync(memoData)
          console.log('🆕 API生成ID:', result.id)
          setApiMemoId(result.id) // 以降は更新APIを使用
        }
        
        setSavedSuccessfully(true)
        setHasUserEdited(false) // 保存成功後は編集フラグをリセット
        console.log('✅ API保存成功:', title.trim() || '(無題)')
        
        // 成功表示を3秒後にクリア
        setTimeout(() => setSavedSuccessfully(false), 3000)
        
      } catch (error) {
        console.error('❌ API保存失敗:', error)
        setSaveError('保存に失敗しました')
      } finally {
        setIsSaving(false)
      }
    } else {
      console.log('🔴 オフライン時の保存処理:', title.trim() || '(無題)')
      const memoData = {
        title: title.trim(),
        content: content.trim(),
        id: memo?.id || tempId,
        lastModified: Date.now(),
        lastEditedAt: Math.floor(Date.now() / 1000),
        isEditing: true
      }
      
      // ローカルストレージに保存
      const currentKey = `memo_draft_${memoData.id}`
      localStorage.setItem(currentKey, JSON.stringify(memoData))
      console.log('🔵 ローカル保存:', memoData.title || '(無題)', currentKey)
    }
  }, [title, content, memo, tempId, isOnline, isEditMode, clientGeneratedId, createNote, updateNote])

  // 3秒後の自動保存処理（コメントアウト）
  // const handleAutoSave = useCallback(() => {
  //   if (timeoutRef.current) {
  //     clearTimeout(timeoutRef.current)
  //   }

  //   timeoutRef.current = setTimeout(async () => {
  //     if (title.trim()) {
  //       setIsSaving(true)
  //       setError(null)
  //       setSavedSuccessfully(false)
        
  //       try {
  //         const memoData = {
  //           title: title.trim(),
  //           content: content.trim() || undefined
  //         }

  //         if (isEditMode && memo) {
  //           // 既存メモの更新
  //           await updateNote.mutateAsync({
  //             id: memo.id,
  //             data: memoData
  //           })
  //           setSavedSuccessfully(true)
  //           onSave?.(memo.id)
  //         } else if (!createdMemoId) {
  //           // 新規メモの作成
  //           const result = await createNote.mutateAsync(memoData)
  //           setCreatedMemoId(result.id)
  //           setSavedSuccessfully(true)
  //           onSave?.(result.id)
  //         }
  //       } catch (error) {
  //         console.error('保存に失敗しました:', error)
  //         setError('保存に失敗しました。APIサーバーが起動していることを確認してください。')
  //       } finally {
  //         setIsSaving(false)
  //       }
  //     }
  //   }, 3000)
  // }, [title, content, isEditMode, memo, createdMemoId, createNote, updateNote, onSave])

  // 新規メモの即座API同期（無効化 - use-api-syncに一本化）
  // const handleImmediateSync = useCallback(async () => {
  //   ...
  // }, [...])


  // 1秒デバウンス保存（編集時のみ、保存済み内容と異なる場合のみ）
  const [lastSavedContent, setLastSavedContent] = useState<{title: string, content: string} | null>(null)
  
  useEffect(() => {
    if (hasUserEdited && (title.trim() || content.trim()) && !isSaving) {
      // 前回保存した内容と同じ場合はスキップ
      if (lastSavedContent && 
          lastSavedContent.title === title.trim() && 
          lastSavedContent.content === content.trim()) {
        return
      }
      
      setSavedSuccessfully(false)
      setSaveError(null)
      
      // 1秒後に保存実行
      const saveTimer = setTimeout(() => {
        handleSave()
        setLastSavedContent({ title: title.trim(), content: content.trim() })
      }, 1000)
      
      return () => clearTimeout(saveTimer)
    }
  }, [title, content, hasUserEdited, isSaving, lastSavedContent, handleSave])

  // タイマークリーンアップ
  useEffect(() => {
    const currentTimeout = timeoutRef.current
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
    }
  }, [])

  // カスタムセッター（編集フラグ付き）
  const setTitleWithEdit = useCallback((newTitle: string) => {
    setTitle(newTitle)
    setLastEditedAt(Date.now())
    setHasUserEdited(true)
  }, [])

  const setContentWithEdit = useCallback((newContent: string) => {
    setContent(newContent)
    setLastEditedAt(Date.now())
    setHasUserEdited(true)
  }, [])

  return {
    title,
    setTitle: setTitleWithEdit,
    content,
    setContent: setContentWithEdit,
    savedSuccessfully,
    isEditMode,
    createdMemoId: clientGeneratedId, // ローカル表示用ID
    lastEditedAt,
    tempId,
    isSaving,
    saveError
  }
}