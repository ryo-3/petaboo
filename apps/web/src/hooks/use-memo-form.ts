import { useEffect, useRef, useState, useCallback } from 'react'
import type { Memo } from '@/src/types/memo'

interface UseMemoFormOptions {
  memo?: Memo | null
}

export function useMemoForm({ memo = null }: UseMemoFormOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || '')
  const [content, setContent] = useState(() => memo?.content || '')
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [createdMemoId, setCreatedMemoId] = useState<number | null>(memo?.id || null)
  const [tempId] = useState(() => `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [hasUserEdited, setHasUserEdited] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Removed unused variables: createNote, updateNote, queryClient, isSaving, error, onSave, setIsSaving, setError
  
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

  // ローカルストレージ保存処理（リアルタイム）
  const handleLocalSave = useCallback(() => {
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
    // console.log('ローカル保存:', memoData.title || '(無題)')
  }, [title, content, memo, tempId])

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


  // ユーザーが実際に編集した時のみローカルストレージに保存
  useEffect(() => {
    if (hasUserEdited && (title.trim() || content.trim())) {
      setSavedSuccessfully(false)
      handleLocalSave()
    }
  }, [title, content, hasUserEdited, handleLocalSave])

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
    setHasUserEdited(true)
  }, [])

  const setContentWithEdit = useCallback((newContent: string) => {
    setContent(newContent)
    setHasUserEdited(true)
  }, [])

  return {
    title,
    setTitle: setTitleWithEdit,
    content,
    setContent: setContentWithEdit,
    savedSuccessfully,
    isEditMode,
    createdMemoId
  }
}