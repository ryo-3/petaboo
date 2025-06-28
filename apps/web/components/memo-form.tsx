'use client'

import CheckIcon from '@/components/icons/check-icon'
import TrashIcon from '@/components/icons/trash-icon'
import MemoDateInfo from '@/components/memo-date-info'
import EditButton from '@/components/ui/edit-button'
import { useMemoForm } from '@/src/hooks/use-memo-form'
import { useState } from 'react'
import type { Memo } from '@/src/types/memo'

interface MemoFormProps {
  onClose: () => void
  memo?: Memo | null
  onSave?: (id: number) => void
  onExitEdit?: () => void
}

function MemoForm({ onClose, memo = null, onSave, onExitEdit }: MemoFormProps) {
  const [isEditing, setIsEditing] = useState(true)
  const {
    title,
    setTitle,
    content,
    setContent,
    isSaving,
    error,
    savedSuccessfully,
    isEditMode,
    createdMemoId
  } = useMemoForm({ memo, onSave })

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-start items-center mb-4">
        <EditButton 
          isEditing={isEditing} 
          onEdit={() => setIsEditing(true)}
          onExitEdit={() => {
            setIsEditing(false)
            if (onExitEdit) onExitEdit()
          }} 
        />
        
        <div className="flex items-center gap-3 ml-auto">
          {error && (
            <span className="text-sm text-red-500">エラー</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <MemoDateInfo memo={memo} createdMemoId={createdMemoId} />
        
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`flex-1 text-lg font-medium border-b outline-none pb-2 ${
              isEditing 
                ? 'border-Green focus:border-Green' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
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

export default MemoForm