'use client'

import CheckIcon from '@/components/icons/check-icon'
import TrashIcon from '@/components/icons/trash-icon'
import { useCreateNote, useUpdateNote } from '@/src/hooks/use-notes'
import { useEffect, useRef, useState, useCallback } from 'react'

import type { Memo } from '@/src/types/memo'

interface MemoEditorProps {
  onClose: () => void
  memo?: Memo | null
}

function MemoEditor({ onClose, memo = null }: MemoEditorProps) {
  const [title, setTitle] = useState(memo?.title || '')
  const [content, setContent] = useState(memo?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [currentMemoId, setCurrentMemoId] = useState<number | null>(memo?.id || null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()

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
          if (currentMemoId) {
            // 既存メモの更新
            await updateNote.mutateAsync({
              id: currentMemoId,
              data: {
                title: title.trim(),
                content: content.trim() || undefined
              }
            })
          } else {
            // 新規メモの作成
            const result = await createNote.mutateAsync({
              title: title.trim(),
              content: content.trim() || undefined
            })
            // 作成されたメモのIDを保存
            setCurrentMemoId(result.id)
          }
          setSavedSuccessfully(true)
          // 保存成功時は編集モードを継続（閉じない）
        } catch (error) {
          console.error('保存に失敗しました:', error)
          setError('保存に失敗しました。APIサーバーが起動していることを確認してください。')
        } finally {
          setIsSaving(false)
        }
      }
    }, 3000)
  }, [title, content, currentMemoId, createNote, updateNote])

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

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-sm text-gray-500">保存中...</span>
          )}
          {error && (
            <span className="text-sm text-red-500">エラー</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-lg font-medium border-b border-gray-200 outline-none pb-2 focus:border-blue-500"
            autoFocus
          />
          {savedSuccessfully && !isSaving && (
            <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
        </div>

        <textarea
          placeholder="内容を入力..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none outline-none text-gray-700 leading-relaxed"
        />

        <div className="text-xs text-gray-400 mt-auto">
          {error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            '入力完了から3秒後に自動保存されます'
          )}
        </div>
      </div>

      {/* 右下のゴミ箱ボタン */}
      <button
        onClick={onClose}
        className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
      >
        <TrashIcon />
      </button>
    </div>
  )
}

export default MemoEditor