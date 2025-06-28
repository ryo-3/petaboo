'use client'

import TrashIcon from '@/components/icons/trash-icon'
import MemoDateInfo from '@/components/memo-date-info'
import EditButton from '@/components/ui/edit-button'
import { useDeleteNote } from '@/src/hooks/use-notes'
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

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync(memo.id)
      onClose() // 削除後に閉じる
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-start items-center mb-4">
        {onEdit && (
          <EditButton
            isEditing={isEditMode}
            onEdit={() => onEdit(memo)}
            onExitEdit={onExitEdit}
          />
        )}
        <button
          onClick={handleDelete}
          className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <MemoDateInfo memo={memo} />
        
        <div className="border-b border-gray-200 pb-2">
          <h1 className="text-lg font-medium text-gray-800">{memo.title}</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {memo.content ? (
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {memo.content}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              内容がありません
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default MemoViewer