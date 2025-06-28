'use client'

import MemoIcon from "@/components/icons/memo-icon";
import PlusIcon from "@/components/icons/plus-icon";
import { useNotes } from '@/src/hooks/use-notes';
import LogoutButton from "./button/logout-button";
import HomeButton from "./button/home-button";
import type { Memo } from "@/src/types/memo";

interface MemoListProps {
  onNewMemo: () => void;
  onSelectMemo: (memo: Memo) => void;
  onShowFullList: () => void;
  onHome: () => void;
  onEditMemo: (memo: Memo) => void;
}

function MemoList({ onNewMemo, onSelectMemo, onShowFullList, onHome, onEditMemo }: MemoListProps) {
  const { data: notes, isLoading, error } = useNotes()

  return (
    <div className="flex flex-col justify-between h-screen">
      <div>
        {/* ホームボタン */}
        <div className="flex justify-start mx-2 mt-2">
          <HomeButton onClick={onHome} />
        </div>
        
        <button
          onClick={onNewMemo}
          className="bg-emerald-200 hover:bg-emerald-300 text-center mx-2 rounded-lg mt-2 w-[calc(100%-16px)] py-2 transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5 text-slate-600" />
          <span className="text-slate-600 font-medium text-lg">新規追加</span>
        </button>

        
        <div className="mx-2 mt-4">
          <div className="flex items-center gap-1 mb-2 group cursor-pointer" onClick={onShowFullList}>
            <MemoIcon className="w-4 h-4 text-gray-600 group-hover:scale-110 transition-all duration-200" />
            <button
              className="text-sm font-medium text-gray-600 transition-all duration-200 group-hover:translate-x-1"
            >
              メモ一覧
            </button>
          </div>
          
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
              {notes.map((memo: Memo) => (
                <li key={memo.id}>
                  <div className="relative group">
                    <button
                      onClick={() => onSelectMemo(memo)}
                      className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-800 truncate pr-8">
                        {memo.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {memo.content || '内容なし'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(memo.createdAt * 1000).toLocaleDateString('ja-JP')}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMemo(memo);
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MemoIcon className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

        </div>
      </div>
      <div className="flex justify-start px-2 pb-4">
        <LogoutButton />
      </div>
    </div>
  );
}

export default MemoList;
