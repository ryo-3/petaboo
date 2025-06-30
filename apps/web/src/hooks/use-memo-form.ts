import { useEffect, useRef, useState, useCallback } from 'react'
import { useCreateNote, useUpdateNote } from '@/src/hooks/use-notes'
import type { Memo } from '@/src/types/memo'

interface UseMemoFormOptions {
  memo?: Memo | null
  onSave?: (id: number) => void
}

export function useMemoForm({ memo = null, onSave }: UseMemoFormOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || '')
  const [content, setContent] = useState(() => memo?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [createdMemoId, setCreatedMemoId] = useState<number | null>(memo?.id || null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  
  const isEditMode = Boolean(memo)

  // memoが変更された時にstateを更新（新しいメモに切り替わった場合）
  useEffect(() => {
    if (memo && memo.id !== createdMemoId) {
      setTitle(memo.title || '')
      setContent(memo.content || '')
      setCreatedMemoId(memo.id)
    }
  }, [memo, createdMemoId])

  // ローカルストレージ保存処理（リアルタイム）
  const handleLocalSave = useCallback(() => {
    const memoData = {
      title: title.trim(),
      content: content.trim(),
      id: createdMemoId || memo?.id || 'new',
      lastModified: Date.now()
    }
    
    // ローカルストレージに保存
    localStorage.setItem(`memo_draft_${memoData.id}`, JSON.stringify(memoData))
    console.log('ローカル保存:', memoData.title || '(無題)', memoData.content)
  }, [title, content, createdMemoId, memo])

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

  // タイトルまたは内容が変更されたらローカルストレージに保存
  useEffect(() => {
    if (title.trim() || content.trim()) {
      setSavedSuccessfully(false)
      handleLocalSave()
    }
  }, [title, content, handleLocalSave])

  // タイマークリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    title,
    setTitle,
    content,
    setContent,
    isSaving,
    error,
    savedSuccessfully,
    isEditMode,
    createdMemoId
  }
}