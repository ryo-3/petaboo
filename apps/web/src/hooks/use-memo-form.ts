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

  // 3秒後の自動保存処理
  const handleAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      if (title.trim()) {
        setIsSaving(true)
        setError(null)
        setSavedSuccessfully(false)
        
        try {
          const memoData = {
            title: title.trim(),
            content: content.trim() || undefined
          }

          if (isEditMode && memo) {
            // 既存メモの更新
            await updateNote.mutateAsync({
              id: memo.id,
              data: memoData
            })
            setSavedSuccessfully(true)
            onSave?.(memo.id)
          } else if (!createdMemoId) {
            // 新規メモの作成
            const result = await createNote.mutateAsync(memoData)
            setCreatedMemoId(result.id)
            setSavedSuccessfully(true)
            onSave?.(result.id)
          }
        } catch (error) {
          console.error('保存に失敗しました:', error)
          setError('保存に失敗しました。APIサーバーが起動していることを確認してください。')
        } finally {
          setIsSaving(false)
        }
      }
    }, 3000)
  }, [title, content, isEditMode, memo, createdMemoId, createNote, updateNote, onSave])

  // タイトルまたは内容が変更されたら自動保存タイマーをリセット
  useEffect(() => {
    if (title.trim() || content.trim()) {
      setSavedSuccessfully(false) // 入力時は保存成功状態をリセット
      handleAutoSave()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [title, content, handleAutoSave])

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