'use client'

import BaseViewer from '@/components/shared/base-viewer'
import PhotoIcon from '@/components/icons/photo-icon'
import { useDeleteNote } from '@/src/hooks/use-notes'
import { useState, useEffect } from 'react'
import type { Memo } from '@/src/types/memo'

interface MemoEditorProps {
  memo: Memo
  onClose: () => void
  onEdit?: (memo: Memo) => void
  onDeleteAndSelectNext?: (deletedMemo: Memo) => void
}

function MemoEditor({ memo, onClose, onDeleteAndSelectNext }: MemoEditorProps) {
  const deleteNote = useDeleteNote()
  
  // 常に編集可能モード
  const [title, setTitle] = useState(memo.title)
  const [content, setContent] = useState(memo.content || '')
  const [error, setError] = useState<string | null>(null)
  const [hasUserEdited, setHasUserEdited] = useState(false)
  const [currentMemoId, setCurrentMemoId] = useState(memo.id)

  // メモが変更された時に状態を更新（ローカルストレージから復元を優先）
  useEffect(() => {
    // memo.idが変わった時の処理
    if (memo.id !== currentMemoId) {
      setHasUserEdited(false)
      setCurrentMemoId(memo.id)
      
      // 状態を更新
      const localData = localStorage.getItem(`memo_draft_${memo.id}`)
      if (localData) {
        try {
          const parsed = JSON.parse(localData)
          setTitle(parsed.title || memo.title)
          setContent(parsed.content || memo.content || '')
        } catch {
          setTitle(memo.title)
          setContent(memo.content || '')
        }
      } else {
        setTitle(memo.title)
        setContent(memo.content || '')
      }
      setError(null)
    }
  }, [memo.id, memo.title, memo.content, currentMemoId])

  const handleDelete = async () => {
    try {
      // console.log('=== MemoEditor: メモ削除処理開始 ===')
      // console.log('削除対象メモ:', memo)
      // console.log('onDeleteAndSelectNext関数存在:', !!onDeleteAndSelectNext)
      
      await deleteNote.mutateAsync(memo.id)
      // console.log('削除完了')
      
      // 削除後に次のメモを選択する処理があれば実行、なければエディターを閉じる
      if (onDeleteAndSelectNext) {
        // console.log('次のメモ選択処理を実行')
        onDeleteAndSelectNext(memo)
      } else {
        // console.log('エディターを閉じます')
        onClose()
      }
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }

  // ユーザーが実際に編集した時のみローカルストレージに保存
  useEffect(() => {
    // 現在のメモIDと一致し、ユーザーが編集した場合のみ保存
    if (hasUserEdited && memo.id === currentMemoId && (title.trim() || content.trim())) {
      const now = Math.floor(Date.now() / 1000)
      const memoData = {
        title: title.trim(),
        content: content.trim(),
        id: memo.id,
        lastModified: now,
        lastEditedAt: now,
        isEditing: true
      }
      
      const storageKey = `memo_draft_${memo.id}`
      localStorage.setItem(storageKey, JSON.stringify(memoData))
      
    }
  }, [title, content, hasUserEdited, memo.id, currentMemoId])

  return (
    <BaseViewer
      item={memo}
      onClose={onClose}
      onDelete={handleDelete}
      error={error}
      isEditing={true}
      headerActions={
        <div className="flex items-center gap-2">
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
      }
    >
        
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setHasUserEdited(true)
            }}
            className="flex-1 text-lg font-medium border-b border-Green outline-none pb-2 focus:border-Green"
          />
        </div>

        <textarea
          placeholder="内容を入力..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setHasUserEdited(true)
          }}
          className="flex-1 resize-none outline-none text-gray-700 leading-relaxed"
        />
    </BaseViewer>
  )
}

export default MemoEditor