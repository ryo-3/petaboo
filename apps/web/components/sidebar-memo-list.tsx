'use client'

import PenIcon from "@/components/icons/pen-icon";
import TrashIcon from "@/components/icons/trash-icon";
import Tooltip from '@/components/ui/tooltip';
import { useNotes, useDeleteNote } from '@/src/hooks/use-notes';
import type { Memo } from "@/src/types/memo";
import { formatDateOnly } from "@/src/utils/formatDate";

interface SidebarMemoListProps {
  onSelectMemo: (memo: Memo) => void;
  onEditMemo: (memo: Memo) => void;
  onDeleteMemo?: (memo: Memo) => void;
  selectedMemoId?: number;
}

function SidebarMemoList({ onSelectMemo, onEditMemo, onDeleteMemo, selectedMemoId }: SidebarMemoListProps) {
  const { data: notes, isLoading, error } = useNotes()
  const deleteNote = useDeleteNote()

  const handleDelete = async (memo: Memo) => {
    try {
      await deleteNote.mutateAsync(memo.id)
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-gray-500">読み込み中...</div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500 text-sm">
        エラーが発生しました
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        メモがありません
      </div>
    )
  }

  return (
    <ul className="space-y-1">
      {notes.map((memo: Memo) => (
        <li key={memo.id}>
          <div className={`relative flex p-2 rounded transition-colors group ${
            selectedMemoId === memo.id 
              ? 'bg-Green/10 hover:bg-Green/20' 
              : 'hover:bg-gray-100'
          }`}>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectMemo(memo)}>
              <div className="font-medium text-sm text-gray-800 truncate mb-1">
                {memo.title}
              </div>
              <div className="text-xs text-gray-500 truncate mb-1">
                {memo.content || '内容なし'}
              </div>
              <div className="text-xs text-gray-400">
                {memo.updatedAt && memo.updatedAt !== memo.createdAt 
                  ? formatDateOnly(memo.updatedAt)
                  : formatDateOnly(memo.createdAt)
                }
              </div>
            </div>
            <div className="flex-shrink-0 ml-2 flex flex-col justify-between self-stretch opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip text="編集" position="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMemo(memo);
                  }}
                  className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
                >
                  <PenIcon className="w-3 h-3" />
                </button>
              </Tooltip>
              <Tooltip text="削除" position="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(memo);
                  }}
                  className="flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded self-end"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </Tooltip>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default SidebarMemoList;