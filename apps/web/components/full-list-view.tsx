"use client";

import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import SwitchTabs from "@/components/ui/switch-tabs";
import MemoCard from "@/components/ui/memo-card";
import MemoListItem from "@/components/ui/memo-list-item";
import TaskCard from "@/components/ui/task-card";
import TaskListItem from "@/components/ui/task-list-item";
import MemoViewer from "@/components/memo-viewer";
import DeletedMemoViewer from "@/components/deleted-memo-viewer";
import { useDeletedNotes, useNotes, useDeleteNote, usePermanentDeleteNote } from "@/src/hooks/use-notes";
import { useDeletedTasks, useTasks, useDeleteTask, usePermanentDeleteTask } from "@/src/hooks/use-tasks";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useState } from "react";
import TaskViewer from "./task-viewer";

interface FullListViewProps {
  onSelectMemo: (memo: Memo, fromFullList?: boolean) => void;
  onSelectDeletedMemo: (memo: DeletedMemo, fromFullList?: boolean) => void;
  onSelectTask?: (task: Task, fromFullList?: boolean) => void;
  onSelectDeletedTask?: (task: DeletedTask, fromFullList?: boolean) => void;
  currentMode?: 'memo' | 'task';
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
  onEditMemo?: (memo: Memo) => void;
  onEditTask?: (task: Task) => void;
}

function FullListView({
  onSelectMemo,
  onSelectDeletedMemo,
  onSelectTask,
  onSelectDeletedTask,
  currentMode = 'memo',
  selectedMemo,
  selectedDeletedMemo,
  selectedTask,
  selectedDeletedTask,
  onEditMemo,
  onEditTask
}: FullListViewProps) {
  const { data: notes, isLoading: memoLoading, error: memoError } = useNotes();
  const { data: deletedNotes } = useDeletedNotes();
  const { data: tasks, isLoading: taskLoading, error: taskError } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();
  const [activeTab, setActiveTab] = useState<"normal" | "deleted">("normal");
  const [checkedMemos, setCheckedMemos] = useState<Set<number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<number>>(
    new Set()
  );
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [checkedDeletedTasks, setCheckedDeletedTasks] = useState<Set<number>>(
    new Set()
  );
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [columnCount, setColumnCount] = useState(4);

  const deleteNote = useDeleteNote();
  const permanentDeleteNote = usePermanentDeleteNote();
  const deleteTask = useDeleteTask();
  const permanentDeleteTask = usePermanentDeleteTask();
  
  // 右側パネル表示時は列数を-1する（2列以下の場合は変更しない）
  const effectiveColumnCount = (selectedMemo || selectedDeletedMemo || selectedTask || selectedDeletedTask) 
    ? (columnCount <= 2 ? columnCount : columnCount - 1)
    : columnCount;

  const handleBulkDelete = async () => {
    try {
      if (activeTab === 'normal') {
        if (currentMode === 'memo') {
          // 通常メモの一括削除
          const deletePromises = Array.from(checkedMemos).map(id => 
            deleteNote.mutateAsync(id)
          );
          await Promise.all(deletePromises);
          setCheckedMemos(new Set());
        } else {
          // 通常タスクの一括削除
          const deletePromises = Array.from(checkedTasks).map(id => 
            deleteTask.mutateAsync(id)
          );
          await Promise.all(deletePromises);
          setCheckedTasks(new Set());
        }
      } else {
        if (currentMode === 'memo') {
          // 削除済みメモの完全削除
          const deletePromises = Array.from(checkedDeletedMemos).map(id => 
            permanentDeleteNote.mutateAsync(id)
          );
          await Promise.all(deletePromises);
          setCheckedDeletedMemos(new Set());
        } else {
          // 削除済みタスクの完全削除
          const deletePromises = Array.from(checkedDeletedTasks).map(id => 
            permanentDeleteTask.mutateAsync(id)
          );
          await Promise.all(deletePromises);
          setCheckedDeletedTasks(new Set());
        }
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
      count: currentMode === 'memo' ? (notes?.length || 0) : (tasks?.length || 0),
    },
    {
      id: "deleted",
      label: "削除済み",
      icon: <TrashIcon className="w-3 h-3" />,
      count: currentMode === 'memo' ? (deletedNotes?.length || 0) : (deletedTasks?.length || 0),
    },
  ];

  return (
    <div className="flex h-full bg-white">
      {/* 左側：一覧表示 */}
      <div className={`${selectedMemo || selectedDeletedMemo || selectedTask || selectedDeletedTask ? 'w-1/2' : 'w-full'} ${selectedMemo || selectedDeletedMemo || selectedTask || selectedDeletedTask ? 'border-r border-gray-300' : ''} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300`}>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
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
        
        {/* コントロール */}
        <div className="flex items-center gap-2">
          {/* ビューモード切り替えボタン */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="カード表示"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="リスト表示"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          {/* カラム数調整 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <span className="text-xs text-gray-600 px-2">列数</span>
            {[1, 2, 3, 4].map((count) => {
              const isRightShown = selectedMemo || selectedDeletedMemo || selectedTask || selectedDeletedTask;
              
              // 右側表示時: 3は非表示、4は「3」として表示
              if (isRightShown && count === 3) return null;
              
              return (
                <button
                  key={count}
                  onClick={() => setColumnCount(count)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    (isRightShown && count === 4 && columnCount === 3) || // 右側表示時の3列設定
                    (isRightShown && count === 4 && columnCount === 4) || // 右側表示時の4列設定  
                    (!isRightShown && columnCount === count) || // 通常時
                    (isRightShown && columnCount <= 2 && columnCount === count) // 右側表示時の1-2列
                      ? 'bg-white text-gray-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {isRightShown && count === 4 ? '3' : count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {(currentMode === 'memo' ? memoLoading : taskLoading) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">読み込み中...</div>
        </div>
      )}

      {(currentMode === 'memo' ? memoError : taskError) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">エラーが発生しました</div>
        </div>
      )}


      {/* 通常タブ */}
      {activeTab === "normal" && (
        <>
          {currentMode === 'memo' ? (
            notes && notes.length > 0 ? (
              <div className="flex-1 overflow-auto pr-2">
                <div className={viewMode === 'card' ? `grid gap-4 ${
                  effectiveColumnCount === 1 ? 'grid-cols-1' :
                  effectiveColumnCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  effectiveColumnCount === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }` : `${
                  effectiveColumnCount === 1 ? 'space-y-0' :
                  effectiveColumnCount === 2 ? 'grid grid-cols-2 gap-x-4' :
                  effectiveColumnCount === 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4' :
                  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4'
                }`}>
                  {notes.map((memo: Memo) => {
                    const Component = viewMode === 'card' ? MemoCard : MemoListItem;
                    return (
                      <Component
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
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">メモがありません</div>
              </div>
            )
          ) : (
            tasks && tasks.length > 0 ? (
              <div className="flex-1 overflow-auto pr-2">
                <div className={viewMode === 'card' ? `grid gap-4 ${
                  effectiveColumnCount === 1 ? 'grid-cols-1' :
                  effectiveColumnCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  effectiveColumnCount === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }` : `${
                  effectiveColumnCount === 1 ? 'space-y-0' :
                  effectiveColumnCount === 2 ? 'grid grid-cols-2 gap-x-4' :
                  effectiveColumnCount === 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4' :
                  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4'
                }`}>
                  {tasks.map((task: Task) => {
                    const Component = viewMode === 'card' ? TaskCard : TaskListItem;
                    return (
                      <Component
                        key={task.id}
                        task={task}
                        isChecked={checkedTasks.has(task.id)}
                        onToggleCheck={() => {
                          const newChecked = new Set(checkedTasks);
                          if (checkedTasks.has(task.id)) {
                            newChecked.delete(task.id);
                          } else {
                            newChecked.add(task.id);
                          }
                          setCheckedTasks(newChecked);
                        }}
                        onSelect={() => onSelectTask!(task, true)}
                        variant="normal"
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">タスクがありません</div>
              </div>
            )
          )}
        </>
      )}

      {/* 削除済みタブ */}
      {activeTab === "deleted" && (
        <>
          {currentMode === 'memo' ? (
            deletedNotes && deletedNotes.length > 0 ? (
              <div className="flex-1 overflow-auto pr-2">
                <div className={viewMode === 'card' ? `grid gap-4 ${
                  effectiveColumnCount === 1 ? 'grid-cols-1' :
                  effectiveColumnCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  effectiveColumnCount === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }` : `${
                  effectiveColumnCount === 1 ? 'space-y-0' :
                  effectiveColumnCount === 2 ? 'grid grid-cols-2 gap-x-4' :
                  effectiveColumnCount === 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4' :
                  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4'
                }`}>
                  {deletedNotes.map((memo: DeletedMemo) => {
                    const Component = viewMode === 'card' ? MemoCard : MemoListItem;
                    return (
                      <Component
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
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  削除済みメモはありません
                </div>
              </div>
            )
          ) : (
            deletedTasks && deletedTasks.length > 0 ? (
              <div className="flex-1 overflow-auto pr-2">
                <div className={viewMode === 'card' ? `grid gap-4 ${
                  effectiveColumnCount === 1 ? 'grid-cols-1' :
                  effectiveColumnCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  effectiveColumnCount === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }` : `${
                  effectiveColumnCount === 1 ? 'space-y-0' :
                  effectiveColumnCount === 2 ? 'grid grid-cols-2 gap-x-4' :
                  effectiveColumnCount === 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4' :
                  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4'
                }`}>
                  {deletedTasks.map((task: DeletedTask) => {
                    const Component = viewMode === 'card' ? TaskCard : TaskListItem;
                    return (
                      <Component
                        key={task.id}
                        task={task}
                        isChecked={checkedDeletedTasks.has(task.id)}
                        onToggleCheck={() => {
                          const newChecked = new Set(checkedDeletedTasks);
                          if (checkedDeletedTasks.has(task.id)) {
                            newChecked.delete(task.id);
                          } else {
                            newChecked.add(task.id);
                          }
                          setCheckedDeletedTasks(newChecked);
                        }}
                        onSelect={() => onSelectDeletedTask!(task, true)}
                        variant="deleted"
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  削除済みタスクはありません
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* 一括削除ボタン */}
      {(() => {
        const shouldShow = currentMode === 'memo' 
          ? (activeTab === 'normal' && checkedMemos.size > 0) || (activeTab === 'deleted' && checkedDeletedMemos.size > 0)
          : (activeTab === 'normal' && checkedTasks.size > 0) || (activeTab === 'deleted' && checkedDeletedTasks.size > 0);
        return shouldShow;
      })() && (
        <button
          onClick={handleBulkDelete}
          className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors z-50"
          title={activeTab === 'normal' 
            ? `${currentMode === 'memo' ? checkedMemos.size : checkedTasks.size}件の${currentMode === 'memo' ? 'メモ' : 'タスク'}を削除`
            : `${currentMode === 'memo' ? checkedDeletedMemos.size : checkedDeletedTasks.size}件の${currentMode === 'memo' ? 'メモ' : 'タスク'}を完全削除`
          }
        >
          <TrashIcon />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {currentMode === 'memo'
              ? (activeTab === 'normal' ? checkedMemos.size : checkedDeletedMemos.size)
              : (activeTab === 'normal' ? checkedTasks.size : checkedDeletedTasks.size)
            }
          </span>
        </button>
      )}
      </div>
      
      {/* 右側：詳細表示（選択時のみ表示） */}
      {(selectedMemo || selectedDeletedMemo || selectedTask || selectedDeletedTask) && (
        <div className="w-1/2 p-6 animate-slide-in-right relative">
          {/* 区切り線の閉じるボタン */}
          <button
            onClick={() => {
              if (selectedMemo) {
                onSelectMemo(null as unknown as Memo, true);
              } else if (selectedDeletedMemo) {
                onSelectDeletedMemo(null as unknown as DeletedMemo, true);
              } else if (selectedTask) {
                onSelectTask!(null as unknown as Task, true);
              } else if (selectedDeletedTask) {
                onSelectDeletedTask!(null as unknown as DeletedTask, true);
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
          ) : selectedTask ? (
            <TaskViewer 
              task={selectedTask} 
              onClose={() => {}} 
              onEdit={onEditTask}
              isEditMode={false}
            />
          ) : selectedDeletedMemo ? (
            <DeletedMemoViewer 
              memo={selectedDeletedMemo} 
              onClose={() => {}} 
            />
          ) : selectedDeletedTask ? (
            <div className="p-6">削除済みタスクビューアー（未実装）</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default FullListView;
