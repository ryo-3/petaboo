'use client'

import PenIcon from "@/components/icons/pen-icon";
import { useNotes } from '@/src/hooks/use-notes';
import type { Memo } from "@/src/types/memo";
import { formatDateOnly } from "@/src/utils/formatDate";

interface SidebarMemoListProps {
  onSelectMemo: (memo: Memo) => void;
  onEditMemo: (memo: Memo) => void;
  selectedMemoId?: number;
}

function SidebarMemoList({ onSelectMemo, onEditMemo, selectedMemoId }: SidebarMemoListProps) {
  const { data: notes, isLoading, error } = useNotes()

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
          <div className={`flex items-start p-2 rounded transition-colors group ${
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
            <div className="flex-shrink-0 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditMemo(memo);
                }}
                className="flex items-center justify-center text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
              >
                <PenIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default SidebarMemoList;