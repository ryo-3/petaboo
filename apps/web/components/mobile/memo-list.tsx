'use client'

import SidebarItem from '@/components/shared/sidebar-item';
import LoadingState from '@/components/ui/feedback/loading-state';
import ErrorState from '@/components/ui/feedback/error-state';
import EmptyState from '@/components/ui/feedback/empty-state';
import { useNotes, useDeleteNote } from '@/src/hooks/use-notes';
import { useLocalStorageSync } from '@/src/hooks/use-local-storage-sync';
import type { Memo } from "@/src/types/memo";
import { formatDateOnly } from "@/src/utils/formatDate";

interface SidebarMemoListProps {
  onSelectMemo: (memo: Memo) => void;
  onEditMemo: (memo: Memo) => void;
  onDeleteMemo?: (memo: Memo) => void;
  selectedMemoId?: number;
}

// Memo item component with localStorage sync
function SidebarMemoItem({ memo, onSelect, onEdit, onDelete, isSelected }: {
  memo: Memo;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
}) {
  const { displayTitle, displayContent } = useLocalStorageSync(
    memo.id,
    memo.title,
    memo.content || ''
  );

  return (
    <SidebarItem
      isSelected={isSelected}
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div className="font-medium text-sm text-gray-800 truncate mb-1">
        {displayTitle}
      </div>
      <div className="text-xs text-gray-500 truncate mb-1">
        {displayContent || '内容なし'}
      </div>
      <div className="text-xs text-gray-400">
        {memo.updatedAt && memo.updatedAt !== memo.createdAt 
          ? formatDateOnly(memo.updatedAt)
          : formatDateOnly(memo.createdAt)
        }
      </div>
    </SidebarItem>
  );
}

 
function SidebarMemoList({ onSelectMemo, onEditMemo, onDeleteMemo, selectedMemoId }: SidebarMemoListProps) {
  const { data: notes, isLoading, error } = useNotes()
  const deleteNote = useDeleteNote()

  const handleDelete = async (memo: Memo) => {
    try {
      // console.log('=== メモ削除処理開始 ===')
      // console.log('削除対象メモ:', memo)
      // console.log('現在選択中のメモID:', selectedMemoId)
      // console.log('全メモ数:', notes?.length)
      // console.log('全メモ一覧:', notes?.map(m => ({ id: m.id, title: m.title })))
      
      // 削除前に次のメモを決定
      let nextMemo: Memo | null = null
      
      if (notes && notes.length > 1) {
        const deletedIndex = notes.findIndex(m => m.id === memo.id)
        // console.log('削除対象のインデックス:', deletedIndex)
        
        if (deletedIndex !== -1) {
          // 削除されたメモの次のメモを選択（削除されたメモより後にあるメモ）
          if (deletedIndex < notes.length - 1) {
            nextMemo = notes[deletedIndex + 1] || null
            // console.log('次のメモを選択:', nextMemo)
          }
          // 最後のメモが削除された場合は前のメモを選択
          else if (deletedIndex > 0) {
            nextMemo = notes[deletedIndex - 1] || null
            // console.log('前のメモを選択:', nextMemo)
          }
        }
      }
      
      // console.log('決定した次のメモ:', nextMemo)
      // console.log('onDeleteMemo関数存在:', !!onDeleteMemo)
      // console.log('選択条件チェック:', nextMemo && onDeleteMemo && selectedMemoId === memo.id)
      
      // 削除実行
      await deleteNote.mutateAsync(memo.id)
      // console.log('削除完了')
      
      // 次のメモが見つかった場合は選択（現在選択中のメモが削除された場合のみ）
      if (nextMemo && onDeleteMemo && selectedMemoId === memo.id) {
        // console.log('次のメモを選択実行:', nextMemo)
        onDeleteMemo(nextMemo)
      } else {
        // console.log('次のメモ選択をスキップ')
      }
      
      // console.log('=== メモ削除処理終了 ===')
    } catch (error) {
      console.error('削除に失敗しました:', error)
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState />;
  }

  if (!notes || notes.length === 0) {
    return <EmptyState message="メモがありません" variant="simple" />;
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <ul className="space-y-1 pb-8">
        {notes.map((memo: Memo) => (
          <li key={memo.id}>
            <SidebarMemoItem
              memo={memo}
              onSelect={() => onSelectMemo(memo)}
              onEdit={() => onEditMemo(memo)}
              onDelete={() => handleDelete(memo)}
              isSelected={selectedMemoId === memo.id}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SidebarMemoList;