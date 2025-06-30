'use client'

import CheckIcon from '@/components/icons/check-icon'
import TrashIcon from '@/components/icons/trash-icon'
import PhotoIcon from '@/components/icons/photo-icon'
import DateInfo from '@/components/shared/date-info'
import EditButton from '@/components/ui/edit-button'
import { useMemoForm } from '@/src/hooks/use-memo-form'
import { useState, useEffect, useRef } from 'react'
import type { Memo } from '@/src/types/memo'

interface MemoCreatorProps {
  onClose: () => void
  memo?: Memo | null
  onExitEdit?: () => void
}

function MemoCreator({ onClose, memo = null, onExitEdit }: MemoCreatorProps) {
  // 新規作成時は常に編集モード、既存メモの場合は表示モードから開始
  const [isEditing, setIsEditing] = useState(memo === null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const {
    title,
    setTitle,
    content,
    setContent,
    savedSuccessfully,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isEditMode,
    createdMemoId
  } = useMemoForm({ memo })

  // 新規作成時のフォーカス遅延
  useEffect(() => {
    if (memo === null && titleInputRef.current) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-start items-center mb-4">
        <div className="flex items-center gap-2">
          {/* 既存メモの場合のみ編集ボタンを表示 */}
          {memo && (
            <EditButton 
              isEditing={isEditing} 
              onEdit={() => setIsEditing(true)}
              onExitEdit={() => {
                setIsEditing(false)
                if (onExitEdit) onExitEdit()
              }} 
            />
          )}
          
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
          {/* Removed error display as error is no longer available */}
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {memo && <DateInfo item={memo} createdItemId={createdMemoId} />}
        
        <div className="flex items-center gap-3">
          <input
            ref={titleInputRef}
            type="text"
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`flex-1 text-lg font-medium border-b outline-none pb-2 ${
              isEditing 
                ? 'border-Green focus:border-Green' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
          />
          {savedSuccessfully && (
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
          ローカルストレージに自動保存中...
        </div>
      </div>

      {/* 右下の閉じるボタン */}
      <button
        onClick={onClose}
        className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
      >
        <TrashIcon />
      </button>
    </div>
  )
}

export default MemoCreator