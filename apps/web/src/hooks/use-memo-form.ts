import { useState, useCallback, useEffect, useMemo } from 'react'
import type { Memo } from '@/src/types/memo'
import { useCreateNote, useUpdateNote } from '@/src/hooks/use-notes'

interface UseMemoFormOptions {
  memo?: Memo | null
  onMemoAdd?: (memo: Memo) => void
  onMemoUpdate?: (id: number, updates: Partial<Memo>) => void
  onMemoIdUpdate?: (oldId: number, newId: number) => void
}

export function useMemoForm({ memo = null, onMemoAdd, onMemoUpdate, onMemoIdUpdate }: UseMemoFormOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || '')
  const [content, setContent] = useState(() => memo?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  
  // 変更検知用の初期値
  const [initialTitle, setInitialTitle] = useState(() => memo?.title || '')
  const [initialContent, setInitialContent] = useState(() => memo?.content || '')

  const createNote = useCreateNote()
  const updateNote = useUpdateNote()

  // 変更検知
  const hasChanges = useMemo(() => {
    const currentTitle = title.trim()
    const currentContent = content.trim()
    return currentTitle !== initialTitle.trim() || currentContent !== initialContent.trim()
  }, [title, content, initialTitle, initialContent])

  // Update form when memo changes (switching to different memo)
  useEffect(() => {
    if (memo) {
      console.log('📝 メモフォームを既存メモに設定:', memo.title)
      const memoTitle = memo.title || ''
      const memoContent = memo.content || ''
      setTitle(memoTitle)
      setContent(memoContent)
      setInitialTitle(memoTitle)
      setInitialContent(memoContent)
    } else {
      console.log('📝 メモフォームを空にリセット（新規作成）')
      setTitle('')
      setContent('')
      setInitialTitle('')
      setInitialContent('')
    }
  }, [memo])

  const handleSave = useCallback(async () => {
    if (!title.trim() && !content.trim()) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSavedSuccessfully(false)

    try {
      if (memo?.id) {
        // Update existing memo
        console.log('🔄 Updating existing memo:', memo.id)
        const updatedMemo = await updateNote.mutateAsync({
          id: memo.id,
          data: {
            title: title.trim() || "無題",
            content: content.trim() || undefined
          }
        })
        
        console.log('🔍 API戻り値:', updatedMemo)
        // APIが更新データを返さないので、フォームの値を使用
        onMemoUpdate?.(memo.id, {
          title: title.trim() || "無題",
          content: content.trim() || "",
          updatedAt: Math.floor(Date.now() / 1000) // 現在時刻
        })
        
        console.log('✅ Memo updated successfully')
      } else {
        // Create new memo
        console.log('🆕 Creating new memo')
        const createdMemo = await createNote.mutateAsync({
          title: title.trim() || "無題",
          content: content.trim() || undefined
        })
        
        onMemoAdd?.(createdMemo)
        
        // Update IDs if callback provided
        if (onMemoIdUpdate) {
          // For new memos, we don't have an old ID to update from
          // This callback might not be needed for the simplified flow
        }
        
        console.log('✅ Memo created successfully:', createdMemo.id)
      }

      // 保存成功時に初期値を更新
      setInitialTitle(title.trim() || '')
      setInitialContent(content.trim() || '')

      setSavedSuccessfully(true)
      setTimeout(() => setSavedSuccessfully(false), 3000)

    } catch (error) {
      console.error('❌ Save failed:', error)
      setSaveError('保存に失敗しました')
    } finally {
      // 保存中表示を少し長く見せる
      setTimeout(() => setIsSaving(false), 500)
    }
  }, [memo, title, content, createNote, updateNote, onMemoAdd, onMemoUpdate, onMemoIdUpdate])

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  const resetForm = useCallback(() => {
    console.log('🔄 フォームをリセット')
    setTitle('')
    setContent('')
    setInitialTitle('')
    setInitialContent('')
    setSaveError(null)
    setSavedSuccessfully(false)
  }, [])

  return {
    title,
    content,
    isSaving,
    saveError,
    savedSuccessfully,
    hasChanges,
    handleSave,
    handleTitleChange,
    handleContentChange,
    resetForm,
    setTitle,
    setContent
  }
}