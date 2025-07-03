import { useState, useCallback } from 'react'
import type { Memo } from '@/src/types/memo'
import { useCreateNote, useUpdateNote } from '@/src/hooks/use-notes'

interface UseSimpleMemoSaveOptions {
  memo?: Memo | null
  onSaveComplete?: (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => void
}

export function useSimpleMemoSave({ memo = null, onSaveComplete }: UseSimpleMemoSaveOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || '')
  const [content, setContent] = useState(() => memo?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const createNote = useCreateNote()
  const updateNote = useUpdateNote()

  const handleSave = useCallback(async () => {
    const isEmpty = !title.trim() && !content.trim()
    
    setIsSaving(true)
    setSaveError(null)

    try {
      if (memo?.id) {
        // 既存メモ更新
        await updateNote.mutateAsync({
          id: memo.id,
          data: {
            title: title.trim() || "無題",
            content: content.trim() || undefined
          }
        })
        
        const updatedMemo = {
          ...memo,
          title: title.trim() || "無題",
          content: content.trim() || "",
          updatedAt: Math.floor(Date.now() / 1000)
        }
        
        onSaveComplete?.(updatedMemo, isEmpty, false)
      } else {
        // 新規メモ作成
        const createdMemo = await createNote.mutateAsync({
          title: title.trim() || "無題",
          content: content.trim() || undefined
        })
        
        onSaveComplete?.(createdMemo, isEmpty, true)
      }

    } catch (error) {
      console.error('保存に失敗:', error)
      setSaveError('保存に失敗しました')
    } finally {
      // 保存中表示をしっかり見せる
      setTimeout(() => setIsSaving(false), 600)
    }
  }, [memo, title, content, createNote, updateNote, onSaveComplete])

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  return {
    title,
    content,
    isSaving,
    saveError,
    handleSave,
    handleTitleChange,
    handleContentChange,
  }
}