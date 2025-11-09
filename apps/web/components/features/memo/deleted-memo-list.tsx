"use client";

import TrashIcon from "@/components/icons/trash-icon";
import LoadingState from "@/components/ui/feedback/loading-state";
import ErrorState from "@/components/ui/feedback/error-state";
import EmptyState from "@/components/ui/feedback/empty-state";
import { useDeletedMemos } from "@/src/hooks/use-memos";
import LogoutButton from "@/components/ui/buttons/logout-button";
import type { DeletedMemo } from "@/src/types/memo";
import { formatDateOnly } from "@/src/utils/formatDate";
import { stripHtmlTags } from "@/src/utils/htmlUtils";

interface DeletedMemoListProps {
  onBackToMemos: () => void;
  onSelectDeletedMemo: (memo: DeletedMemo) => void;
}

function DeletedMemoList({
  onBackToMemos,
  onSelectDeletedMemo,
}: DeletedMemoListProps) {
  const {
    data: deletedMemos,
    isLoading,
    error,
  } = useDeletedMemos() as {
    data: DeletedMemo[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  return (
    <div className="flex flex-col justify-between">
      <div>
        {/* 戻るボタン */}
        <button
          onClick={onBackToMemos}
          className="bg-blue-200 hover:bg-blue-300 text-center mx-2 rounded-lg mt-4 w-[calc(100%-16px)] py-2 transition-colors"
        >
          <span className="text-slate-600 font-medium text-lg">
            ← 通常メモに戻る
          </span>
        </button>

        <div className="mx-2 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <TrashIcon className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-600">削除済みメモ</h3>
          </div>

          {isLoading && <LoadingState />}

          {error && <ErrorState />}

          {deletedMemos && deletedMemos.length === 0 && (
            <EmptyState message="削除済みメモはありません" variant="simple" />
          )}

          {deletedMemos && deletedMemos.length > 0 && (
            <ul className="space-y-1">
              {deletedMemos.map((memo: DeletedMemo) => (
                <li key={memo.id}>
                  <button
                    onClick={() => onSelectDeletedMemo(memo)}
                    className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors opacity-75"
                  >
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {memo.title}
                    </div>
                    <div
                      className="text-xs text-gray-500 line-clamp-2 mt-1"
                      dangerouslySetInnerHTML={{
                        __html: memo.content || "内容なし",
                      }}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      作成: {formatDateOnly(memo.createdAt)}
                      {memo.updatedAt && memo.updatedAt !== memo.createdAt && (
                        <span className="ml-2">
                          編集: {formatDateOnly(memo.updatedAt)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-red-400 mt-1">
                      削除: {formatDateOnly(memo.deletedAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}

export default DeletedMemoList;
