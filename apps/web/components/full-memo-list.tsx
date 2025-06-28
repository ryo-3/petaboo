'use client'

import MemoIcon from '@/components/icons/memo-icon'
import TrashIcon from '@/components/icons/trash-icon'
import SwitchTabs from '@/components/ui/switch-tabs'
import { useDeletedNotes, useNotes } from '@/src/hooks/use-notes'
import { useState } from 'react'
import type { Memo, DeletedMemo } from '@/src/types/memo'

interface FullMemoListProps {
  onSelectMemo: (memo: Memo) => void;
  onSelectDeletedMemo: (memo: DeletedMemo) => void;
  onClose: () => void;
}

function FullMemoList({ onSelectMemo, onSelectDeletedMemo, onClose }: FullMemoListProps) {
  const { data: notes, isLoading, error } = useNotes()
  const { data: deletedNotes } = useDeletedNotes()
  const [activeTab, setActiveTab] = useState<'normal' | 'deleted'>('normal')

  const tabs = [
    {
      id: 'normal',
      label: '通常',
      count: notes?.length || 0
    },
    {
      id: 'deleted',
      label: '削除済み',
      icon: <TrashIcon className="w-3 h-3" />,
      count: deletedNotes?.length || 0
    }
  ]

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MemoIcon className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-800">メモ一覧</h1>
          </div>
          
          {/* スイッチ風タブ */}
          <SwitchTabs 
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'normal' | 'deleted')}
          />
        </div>
        
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          閉じる
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">読み込み中...</div>
        </div>
      )}
      
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            エラーが発生しました
          </div>
        </div>
      )}
      
      {notes && notes.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            メモがありません
          </div>
        </div>
      )}
      
      {/* 通常メモタブ */}
      {activeTab === 'normal' && (
        <>
          {notes && notes.length > 0 ? (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {notes.map((memo: Memo) => (
                  <button
                    key={memo.id}
                    onClick={() => onSelectMemo(memo)}
                    className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md hover:border-gray-300 transition-all text-left h-40"
                  >
                    <div className="flex flex-col h-full">
                      <div className="font-semibold text-gray-800 text-base mb-2 line-clamp-2">
                        {memo.title}
                      </div>
                      <div className="text-sm text-gray-600 flex-1 overflow-hidden">
                        <div className="line-clamp-4">
                          {memo.content || '内容なし'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        {new Date(memo.createdAt * 1000).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                メモがありません
              </div>
            </div>
          )}
        </>
      )}

      {/* 削除済みメモタブ */}
      {activeTab === 'deleted' && (
        <>
          {deletedNotes && deletedNotes.length > 0 ? (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {deletedNotes.map((memo: DeletedMemo) => (
                  <button
                    key={memo.id}
                    onClick={() => onSelectDeletedMemo(memo)}
                    className="bg-red-50 border border-red-200 p-4 rounded-lg hover:shadow-md hover:border-red-300 transition-all text-left h-40"
                  >
                    <div className="flex flex-col h-full">
                      <div className="font-semibold text-gray-700 text-base mb-2 line-clamp-2">
                        {memo.title}
                      </div>
                      <div className="text-sm text-gray-600 flex-1 overflow-hidden">
                        <div className="line-clamp-4">
                          {memo.content || '内容なし'}
                        </div>
                      </div>
                      <div className="text-xs text-red-400 mt-2 pt-2 border-t border-red-200">
                        削除: {new Date(memo.deletedAt * 1000).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                削除済みメモはありません
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FullMemoList