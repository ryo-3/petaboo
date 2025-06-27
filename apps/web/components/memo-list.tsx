'use client'

import { useNotes } from '@/src/hooks/use-notes'
import LogoutButton from "./logout-button";
import TrashIcon from "@/components/ui/trash-icon";

interface MemoListProps {
  onNewMemo: () => void;
  onSelectMemo: (memo: any) => void;
  onShowDeleted: () => void;
}

function MemoList({ onNewMemo, onSelectMemo, onShowDeleted }: MemoListProps) {
  const { data: notes, isLoading, error } = useNotes()

  return (
    <div className="flex flex-col justify-between h-[97vh]">
      <div>
        <button
          onClick={onNewMemo}
          className="bg-emerald-200 hover:bg-emerald-300 text-center mx-2 rounded-lg mt-4 w-[calc(100%-16px)] py-2 transition-colors"
        >
          <span className="text-slate-600 font-medium text-lg">新規追加</span>
        </button>

        {/* ゴミ箱ボタン */}
        <button
          onClick={onShowDeleted}
          className="bg-gray-200 hover:bg-gray-300 text-center mx-2 rounded-lg mt-2 w-[calc(100%-16px)] py-2 transition-colors flex items-center justify-center gap-2"
        >
          <TrashIcon className="w-4 h-4 text-slate-600" />
          <span className="text-slate-600 font-medium text-sm">削除済みメモ</span>
        </button>
        
        <div className="mx-2 mt-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">メモ一覧</h3>
          
          {isLoading && (
            <div className="text-center py-4 text-gray-500">読み込み中...</div>
          )}
          
          {error && (
            <div className="text-center py-4 text-red-500 text-sm">
              エラーが発生しました
            </div>
          )}
          
          {notes && notes.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              メモがありません
            </div>
          )}
          
          {notes && notes.length > 0 && (
            <ul className="space-y-1">
              {notes.map((memo: any) => (
                <li key={memo.id}>
                  <button
                    onClick={() => onSelectMemo(memo)}
                    className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {memo.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {memo.content || '内容なし'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(memo.createdAt * 1000).toLocaleDateString('ja-JP')}
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

export default MemoList;
