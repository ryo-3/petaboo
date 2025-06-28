'use client'

import TrashIcon from "@/components/icons/trash-icon";
import { useDeletedNotes } from '@/src/hooks/use-notes';
import LogoutButton from "./button/logout-button";

interface DeletedMemoListProps {
  onBackToNotes: () => void;
  onSelectDeletedMemo: (memo: any) => void;
}

function DeletedMemoList({ onBackToNotes, onSelectDeletedMemo }: DeletedMemoListProps) {
  const { data: deletedNotes, isLoading, error } = useDeletedNotes()

  return (
    <div className="flex flex-col justify-between h-[97vh]">
      <div>
        {/* 戻るボタン */}
        <button
          onClick={onBackToNotes}
          className="bg-blue-200 hover:bg-blue-300 text-center mx-2 rounded-lg mt-4 w-[calc(100%-16px)] py-2 transition-colors"
        >
          <span className="text-slate-600 font-medium text-lg">← 通常メモに戻る</span>
        </button>
        
        <div className="mx-2 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <TrashIcon className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-600">削除済みメモ</h3>
          </div>
          
          {isLoading && (
            <div className="text-center py-4 text-gray-500">読み込み中...</div>
          )}
          
          {error && (
            <div className="text-center py-4 text-red-500 text-sm">
              エラーが発生しました
            </div>
          )}
          
          {deletedNotes && deletedNotes.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              削除済みメモはありません
            </div>
          )}
          
          {deletedNotes && deletedNotes.length > 0 && (
            <ul className="space-y-1">
              {deletedNotes.map((memo: any) => (
                <li key={memo.id}>
                  <button
                    onClick={() => onSelectDeletedMemo(memo)}
                    className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors opacity-75"
                  >
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {memo.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {memo.content || '内容なし'}
                    </div>
                    <div className="text-xs text-red-400 mt-1">
                      削除: {new Date(memo.deletedAt * 1000).toLocaleDateString('ja-JP')}
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

export default DeletedMemoList