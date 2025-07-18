import { useState, useCallback, useEffect, useMemo } from 'react'
import type { Memo } from '@/src/types/memo'
import { useCreateNote, useUpdateNote, useDeleteNote } from '@/src/hooks/use-notes'
import { useAddItemToBoard } from '@/src/hooks/use-boards'
import { useQueryClient } from '@tanstack/react-query'

interface UseSimpleMemoSaveOptions {
  memo?: Memo | null
  onSaveComplete?: (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => void
}

export function useSimpleMemoSave({ memo = null, onSaveComplete }: UseSimpleMemoSaveOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || '')
  const [content, setContent] = useState(() => memo?.content || '')
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // 変更検知用の初期値
  const [initialTitle, setInitialTitle] = useState(() => memo?.title || '')
  const [initialContent, setInitialContent] = useState(() => memo?.content || '')

  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const addItemToBoard = useAddItemToBoard()
  const queryClient = useQueryClient()

  // 変更検知（ボード選択も含める）
  const hasChanges = useMemo(() => {
    const currentTitle = title.trim()
    const currentContent = content.trim()
    const hasBoardSelection = selectedBoardIds.length > 0
    return currentTitle !== initialTitle.trim() || currentContent !== initialContent.trim() || hasBoardSelection
  }, [title, content, initialTitle, initialContent, selectedBoardIds])

  // メモが変更された時の初期値更新
  useEffect(() => {
    if (memo) {
      const memoTitle = memo.title || ''
      const memoContent = memo.content || ''
      setTitle(memoTitle)
      setContent(memoContent)
      setInitialTitle(memoTitle)
      setInitialContent(memoContent)
    } else {
      setTitle('')
      setContent('')
      setInitialTitle('')
      setInitialContent('')
    }
  }, [memo])

  const handleSave = useCallback(async () => {
    const isEmpty = !title.trim() && !content.trim()
    
    setIsSaving(true)
    setSaveError(null)

    try {
      if (memo?.id) {
        // 既存メモ更新
        if (isEmpty) {
          // 空メモの場合は削除
          await deleteNote.mutateAsync(memo.id)
          onSaveComplete?.(memo, true, false)
        } else {
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
          
          // ボード選択時はボードに追加
          if (selectedBoardIds.length > 0 && memo.id) {
            // 各ボードに追加（エラーは個別にキャッチ）
            const addPromises = selectedBoardIds.map(async (boardId) => {
              try {
                await addItemToBoard.mutateAsync({
                  boardId,
                  data: {
                    itemType: 'memo',
                    itemId: memo.id,
                  },
                })
              } catch (error: unknown) {
                // すでに存在する場合はエラーを無視
                if (!(error instanceof Error) || !error.message.includes('already exists')) {
                  console.error(`Failed to add memo to board ${boardId}:`, error)
                }
              }
            })
            
            await Promise.all(addPromises)
            
            // ボード追加後にキャッシュを無効化
            queryClient.invalidateQueries({ 
              queryKey: ["item-boards", "memo", memo.id] 
            })
          }
          
          onSaveComplete?.(updatedMemo, false, false)
        }
      } else {
        // 新規メモ作成（空の場合は何もしない）
        if (!isEmpty) {
          const createdMemo = await createNote.mutateAsync({
            title: title.trim() || "無題",
            content: content.trim() || undefined
          })
          
          // ボード選択時はボードに追加
          if (selectedBoardIds.length > 0 && createdMemo.id) {
            // 各ボードに追加（エラーは個別にキャッチ）
            const addPromises = selectedBoardIds.map(async (boardId) => {
              try {
                await addItemToBoard.mutateAsync({
                  boardId,
                  data: {
                    itemType: 'memo',
                    itemId: createdMemo.id,
                  },
                })
              } catch (error: unknown) {
                // すでに存在する場合はエラーを無視
                if (!(error instanceof Error) || !error.message.includes('already exists')) {
                  console.error(`Failed to add memo to board ${boardId}:`, error)
                }
              }
            })
            
            await Promise.all(addPromises)
            
            // ボード追加後にキャッシュを無効化
            queryClient.invalidateQueries({ 
              queryKey: ["item-boards", "memo", createdMemo.id] 
            })
          }
          
          onSaveComplete?.(createdMemo, false, true)
        } else {
          // 空の新規メモは単に閉じる
          onSaveComplete?.(memo || { id: 0, title: '', content: '', createdAt: 0, updatedAt: 0 }, true, true)
        }
      }

      // 保存成功時に初期値を更新
      setInitialTitle(title.trim() || '')
      setInitialContent(content.trim() || '')
      
      // ボード選択をリセット
      setSelectedBoardIds([])

    } catch (error) {
      console.error('保存に失敗:', error)
      setSaveError('保存に失敗しました')
    } finally {
      // 保存中表示をしっかり見せる
      setTimeout(() => setIsSaving(false), 400)
    }
  }, [memo, title, content, createNote, updateNote, deleteNote, onSaveComplete, addItemToBoard, selectedBoardIds])

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  const handleBoardChange = useCallback((boardIds: number[]) => {
    setSelectedBoardIds(boardIds)
  }, [])

  return {
    title,
    content,
    selectedBoardIds,
    isSaving,
    saveError,
    hasChanges,
    handleSave,
    handleTitleChange,
    handleContentChange,
    handleBoardChange,
  }
}