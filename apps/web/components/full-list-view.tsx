"use client";

import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import SwitchTabs from "@/components/ui/switch-tabs";
import MemoCard from "@/components/ui/memo-card";
import MemoViewer from "@/components/memo-viewer";
import DeletedMemoViewer from "@/components/deleted-memo-viewer";
import { useDeletedNotes, useNotes, useDeleteNote, usePermanentDeleteNote } from "@/src/hooks/use-notes";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import { useState } from "react";

interface FullListViewProps {
  onSelectMemo: (memo: Memo, fromFullList?: boolean) => void;
  onSelectDeletedMemo: (memo: DeletedMemo, fromFullList?: boolean) => void;
  onClose: () => void;
  currentMode?: 'memo' | 'task';
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  onEditMemo?: (memo: Memo) => void;
}

function FullListView({
  onSelectMemo,
  onSelectDeletedMemo,
  onClose,
  currentMode = 'memo',
  selectedMemo,
  selectedDeletedMemo,
  onEditMemo
}: FullListViewProps) {
  const { data: notes, isLoading, error } = useNotes();
  const { data: deletedNotes } = useDeletedNotes();
  const [activeTab, setActiveTab] = useState<"normal" | "deleted">("normal");
  const [checkedMemos, setCheckedMemos] = useState<Set<number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<number>>(
    new Set()
  );

  console.log('Debug - activeTab:', activeTab);
  console.log('Debug - checkedMemos.size:', checkedMemos.size);
  console.log('Debug - checkedDeletedMemos.size:', checkedDeletedMemos.size);
  const deleteNote = useDeleteNote();
  const permanentDeleteNote = usePermanentDeleteNote();

  const handleBulkDelete = async () => {
    try {
      if (activeTab === 'normal') {
        // 通常メモの一括削除
        const deletePromises = Array.from(checkedMemos).map(id => 
          deleteNote.mutateAsync(id)
        );
        await Promise.all(deletePromises);
        setCheckedMemos(new Set());
      } else {
        // 削除済みメモの完全削除
        const deletePromises = Array.from(checkedDeletedMemos).map(id => 
          permanentDeleteNote.mutateAsync(id)
        );
        await Promise.all(deletePromises);
        setCheckedDeletedMemos(new Set());
      }
    } catch (error) {
      console.error('一括削除に失敗しました:', error);
      alert('一括削除に失敗しました。');
    }
  };

  const tabs = [
    {
      id: "normal",
      label: "通常",
      count: notes?.length || 0,
    },
    {
      id: "deleted",
      label: "削除済み",
      icon: <TrashIcon className="w-3 h-3" />,
      count: deletedNotes?.length || 0,
    },
  ];

  return (
    <div className="flex h-full bg-white">
      {/* 左側：一覧表示 */}
      <div className={`${selectedMemo || selectedDeletedMemo ? 'w-1/2' : 'w-full'} ${selectedMemo || selectedDeletedMemo ? 'border-r border-gray-300' : ''} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentMode === 'memo' ? (
              <MemoIcon className="w-6 h-6 text-gray-600" />
            ) : (
              <TaskIcon className="w-6 h-6 text-gray-600" />
            )}
            <h1 className="text-2xl font-bold text-gray-800">{currentMode === 'memo' ? 'メモ一覧' : 'タスク一覧'}</h1>
          </div>

          {/* スイッチ風タブ */}
          <SwitchTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as "normal" | "deleted")}
          />
        </div>

      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">読み込み中...</div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">エラーが発生しました</div>
        </div>
      )}


      {/* 通常メモタブ */}
      {activeTab === "normal" && (
        <>
          {notes && notes.length > 0 ? (
            <div className="flex-1 overflow-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {notes.map((memo: Memo) => (
                  <MemoCard
                    key={memo.id}
                    memo={memo}
                    isChecked={checkedMemos.has(memo.id)}
                    onToggleCheck={() => {
                      const newChecked = new Set(checkedMemos);
                      if (checkedMemos.has(memo.id)) {
                        newChecked.delete(memo.id);
                      } else {
                        newChecked.add(memo.id);
                      }
                      setCheckedMemos(newChecked);
                    }}
                    onSelect={() => onSelectMemo(memo, true)}
                    variant="normal"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">メモがありません</div>
            </div>
          )}
        </>
      )}

      {/* 削除済みメモタブ */}
      {activeTab === "deleted" && (
        <>
          {deletedNotes && deletedNotes.length > 0 ? (
            <div className="flex-1 overflow-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {deletedNotes.map((memo: DeletedMemo) => (
                  <MemoCard
                    key={memo.id}
                    memo={memo}
                    isChecked={checkedDeletedMemos.has(memo.id)}
                    onToggleCheck={() => {
                      const newChecked = new Set(checkedDeletedMemos);
                      if (checkedDeletedMemos.has(memo.id)) {
                        newChecked.delete(memo.id);
                      } else {
                        newChecked.add(memo.id);
                      }
                      setCheckedDeletedMemos(newChecked);
                    }}
                    onSelect={() => onSelectDeletedMemo(memo, true)}
                    variant="deleted"
                  />
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

      {/* 一括削除ボタン */}
      {(() => {
        const shouldShow = (activeTab === 'normal' && checkedMemos.size > 0) || 
                          (activeTab === 'deleted' && checkedDeletedMemos.size > 0);
        console.log('Debug - shouldShow bulk delete button:', shouldShow);
        return shouldShow;
      })() && (
        <button
          onClick={handleBulkDelete}
          className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors z-50"
          title={activeTab === 'normal' ? `${checkedMemos.size}件のメモを削除` : `${checkedDeletedMemos.size}件のメモを完全削除`}
        >
          <TrashIcon />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {activeTab === 'normal' ? checkedMemos.size : checkedDeletedMemos.size}
          </span>
        </button>
      )}
      </div>
      
      {/* 右側：詳細表示（選択時のみ表示） */}
      {(selectedMemo || selectedDeletedMemo) && (
        <div className="w-1/2 p-6 animate-slide-in-right relative">
          {/* 区切り線の閉じるボタン */}
          <button
            onClick={() => {
              if (selectedMemo) {
                onSelectMemo(null as any, true);
              } else if (selectedDeletedMemo) {
                onSelectDeletedMemo(null as any, true);
              }
            }}
            className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {selectedMemo ? (
            <MemoViewer 
              memo={selectedMemo} 
              onClose={() => {}} 
              onEdit={onEditMemo}
              isEditMode={false}
            />
          ) : selectedDeletedMemo ? (
            <DeletedMemoViewer 
              memo={selectedDeletedMemo} 
              onClose={() => {}} 
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default FullListView;
