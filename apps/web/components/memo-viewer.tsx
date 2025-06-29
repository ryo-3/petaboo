'use client'

import TrashIcon from '@/components/icons/trash-icon'
import PhotoIcon from '@/components/icons/photo-icon'
import DateInfo from '@/components/shared/date-info'
import { useDeleteNote, useUpdateNote } from '@/src/hooks/use-notes'
import { useState, useCallback, useEffect } from 'react'
import type { Memo } from '@/src/types/memo'

interface MemoViewerProps {
  memo: Memo
  onClose: () => void
  onEdit?: (memo: Memo) => void
  onExitEdit?: () => void
  isEditMode?: boolean
}

function MemoViewer({ memo, onClose, onEdit, onExitEdit, isEditMode = false }: MemoViewerProps) {
  const deleteNote = useDeleteNote()
  const updateNote = useUpdateNote()
  
  // 常に編集可能モード
  const [title, setTitle] = useState(memo.title)
  const [content, setContent] = useState(memo.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync(memo.id)
      onClose() // 削除後に閉じる
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }

  // 自動保存処理（3秒後）
  const handleAutoSave = useCallback(async () => {
    if (!title.trim()) return

    setIsSaving(true)
    setError(null)
    try {
      await updateNote.mutateAsync({
        id: memo.id,
        data: {
          title: title.trim(),
          content: content.trim() || undefined,
        }
      })
    } catch (error) {
      console.error('保存に失敗しました:', error)
      setError('保存に失敗しました。')
    } finally {
      setIsSaving(false)
    }
  }, [title, content, memo.id, updateNote])

  // 3秒後の自動保存タイマー
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAutoSave()
    }, 3000)

    return () => clearTimeout(timer)
  }, [title, content, handleAutoSave])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-start items-center mb-4">
        <div className="flex items-center gap-2">
          {/* 写真アイコン（今後の画像添付機能用） */}
          <button
            className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors"
            title="画像を添付（今後対応予定）"
            onClick={() => {
              // TODO: 画像添付機能の実装
              alert('画像添付機能は今後実装予定です')
            }}
          >
            <PhotoIcon className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          {isSaving && (
            <span className="text-sm text-gray-500">保存中...</span>
          )}
          {error && (
            <span className="text-sm text-red-500">{error}</span>
          )}
        </div>
        
        <button
          onClick={handleDelete}
          className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <DateInfo item={memo} />
        
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-lg font-medium border-b border-Green outline-none pb-2 focus:border-Green"
          />
        </div>

        <textarea
          placeholder="内容を入力..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none outline-none text-gray-700 leading-relaxed"
        />
      </div>

    </div>
  )
}

export default MemoViewer