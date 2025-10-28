"use client";

import SidebarItem from "@/components/shared/sidebar-item";
import LoadingState from "@/components/ui/feedback/loading-state";
import ErrorState from "@/components/ui/feedback/error-state";
import EmptyState from "@/components/ui/feedback/empty-state";
import { useMemos, useDeleteMemo } from "@/src/hooks/use-memos";
import { useLocalStorageSync } from "@/src/hooks/use-local-storage-sync";
import type { Memo } from "@/src/types/memo";
import { formatDateOnly } from "@/src/utils/formatDate";
import { Plus as PlusIcon } from "lucide-react";

interface SidebarMemoListProps {
  onSelectMemo: (memo: Memo) => void;
  onEditMemo: (memo?: Memo) => void;
  onDeleteMemo?: (memo: Memo) => void;
  selectedMemoId?: number;
}

// Memo item component with localStorage sync
function SidebarMemoItem({
  memo,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
}: {
  memo: Memo;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
}) {
  const { displayTitle, displayContent } = useLocalStorageSync(
    memo.id,
    memo.title,
    memo.content || "",
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
        {displayContent || "内容なし"}
      </div>
      <div className="text-xs text-gray-400">
        {memo.updatedAt && memo.updatedAt !== memo.createdAt
          ? formatDateOnly(memo.updatedAt)
          : formatDateOnly(memo.createdAt)}
      </div>
    </SidebarItem>
  );
}

function SidebarMemoList({
  onSelectMemo,
  onEditMemo,
  onDeleteMemo,
  selectedMemoId,
}: SidebarMemoListProps) {
  const { data: memos, isLoading, error } = useMemos();
  const deleteNote = useDeleteMemo();

  const handleDelete = async (memo: Memo) => {
    try {
      // 削除前に次のメモを決定
      let nextMemo: Memo | null = null;

      if (memos && memos.length > 1) {
        const deletedIndex = memos.findIndex((m) => m.id === memo.id);

        if (deletedIndex !== -1) {
          // 削除されたメモの次のメモを選択（削除されたメモより後にあるメモ）
          if (deletedIndex < memos.length - 1) {
            nextMemo = memos[deletedIndex + 1] || null;
          }
          // 最後のメモが削除された場合は前のメモを選択
          else if (deletedIndex > 0) {
            nextMemo = memos[deletedIndex - 1] || null;
          }
        }
      }

      // 削除実行
      await deleteNote.mutateAsync(memo.id);

      // 次のメモが見つかった場合は選択（現在選択中のメモが削除された場合のみ）
      if (nextMemo && onDeleteMemo && selectedMemoId === memo.id) {
        onDeleteMemo(nextMemo);
      }
    } catch {
      // エラーはミューテーションのエラーハンドリングで処理される
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState />;
  }

  if (!memos || memos.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* 新規追加ボタン */}
        <div className="px-2 mb-2">
          <button
            onClick={() => onEditMemo()}
            className="w-full py-2 px-3 bg-Green hover:bg-Green/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">新規メモ作成</span>
          </button>
        </div>
        <EmptyState message="メモがありません" variant="simple" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 新規追加ボタン */}
      <div className="px-2 mb-2 flex-shrink-0">
        <button
          onClick={() => onEditMemo()}
          className="w-full py-2 px-3 bg-Green hover:bg-Green/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">新規メモ作成</span>
        </button>
      </div>

      {/* メモリスト */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1 pb-8">
          {memos.map((memo: Memo) => {
            if (!memo || memo.id === undefined) return null;
            return (
              <li key={`memo-${memo.id}`}>
                <SidebarMemoItem
                  memo={memo}
                  onSelect={() => onSelectMemo(memo)}
                  onEdit={() => onEditMemo(memo)}
                  onDelete={() => handleDelete(memo)}
                  isSelected={selectedMemoId === memo.id}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default SidebarMemoList;
