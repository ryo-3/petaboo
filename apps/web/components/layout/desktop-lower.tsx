"use client";

import MemoCard from "@/components/features/memo/memo-card";
import MemoListItem from "@/components/features/memo/memo-list-item";
import TaskStatusDisplay, { DeletedTaskDisplay } from "@/components/features/task/task-status-display";
import EmptyState from "@/components/ui/feedback/empty-state";
import ItemGrid from "@/components/ui/layout/item-grid";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";

interface DesktopLowerProps {
  currentMode: "memo" | "task";
  activeTab: "normal" | "deleted" | "todo" | "in_progress" | "completed";
  viewMode: "card" | "list";
  effectiveColumnCount: number;
  isLoading: boolean;
  error: Error | null;
  
  // Selection mode (memo only)
  selectionMode?: "select" | "check";
  
  // Sort options (task only)
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  
  // Date display toggle (task only)
  showEditDate?: boolean;
  
  // Data props
  notes?: Memo[];
  localMemos?: Memo[];
  deletedNotes?: DeletedMemo[];
  tasks?: Task[];
  deletedTasks?: DeletedTask[];
  
  // Selection props
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
  
  // Checked items
  checkedMemos?: Set<number>;
  checkedDeletedMemos?: Set<number>;
  checkedTasks?: Set<number>;
  checkedDeletedTasks?: Set<number>;
  
  // Event handlers
  onToggleCheckMemo?: (memoId: number) => void;
  onToggleCheckDeletedMemo?: (memoId: number) => void;
  onToggleCheckTask?: (taskId: number) => void;
  onToggleCheckDeletedTask?: (taskId: number) => void;
  onSelectMemo?: (memo: Memo) => void;
  onSelectDeletedMemo?: (memo: DeletedMemo) => void;
  onSelectTask?: (task: Task) => void;
  onSelectDeletedTask?: (task: DeletedTask) => void;
}

function DesktopLower({
  currentMode,
  activeTab,
  viewMode,
  effectiveColumnCount,
  isLoading,
  error,
  selectionMode = "select",
  sortOptions = [],
  showEditDate = false,
  localMemos,
  deletedNotes,
  tasks,
  deletedTasks,
  selectedMemo,
  selectedDeletedMemo,
  selectedTask,
  selectedDeletedTask,
  checkedMemos,
  checkedDeletedMemos,
  checkedTasks,
  checkedDeletedTasks,
  onToggleCheckMemo,
  onToggleCheckDeletedMemo,
  onToggleCheckTask,
  onToggleCheckDeletedTask,
  onSelectMemo,
  onSelectDeletedMemo,
  onSelectTask,
  onSelectDeletedTask,
}: DesktopLowerProps) {
  
  // Loading state
  if ((currentMode === "memo" ? isLoading : isLoading)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // Error state
  if ((currentMode === "memo" ? error : error)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-500">エラーが発生しました</div>
      </div>
    );
  }

  // メモの通常タブ
  if (activeTab === "normal" && currentMode === "memo") {
    return (
      <>
        {localMemos && localMemos.length > 0 ? (
          <ItemGrid
            viewMode={viewMode}
            effectiveColumnCount={effectiveColumnCount}
          >
            {localMemos
              .sort((a, b) => {
                // 編集日と作成日を比較してソート（最新が上）
                const getLatestTime = (memo: Memo) => {
                  // 新規作成メモ（ID < 0）の場合
                  if (memo.id < 0) {
                    return memo.updatedAt || memo.createdAt;
                  }

                  // ローカルストレージの編集時間も考慮
                  const localData = localStorage.getItem(
                    `memo_draft_${memo.id}`
                  );
                  let localEditTime = 0;
                  if (localData) {
                    try {
                      const parsed = JSON.parse(localData);
                      if (parsed.id === memo.id && parsed.lastEditedAt) {
                        localEditTime = parsed.lastEditedAt;
                      }
                    } catch {
                      // パースエラーは無視
                    }
                  }
                  
                  // ローカル編集時間、更新日、作成日の最新を取得
                  return Math.max(
                    localEditTime,
                    memo.updatedAt || 0,
                    memo.createdAt
                  );
                };

                return getLatestTime(b) - getLatestTime(a);
              })
              .map((memo: Memo) => {
                const Component =
                  viewMode === "card" ? MemoCard : MemoListItem;
                return (
                  <Component
                    key={memo.id < 0 ? `local-new-${memo.id}` : memo.id}
                    memo={memo}
                    isChecked={checkedMemos?.has(memo.id) || false}
                    onToggleCheck={() => onToggleCheckMemo?.(memo.id)}
                    onSelect={() => {
                      if (selectionMode === "check") {
                        onToggleCheckMemo?.(memo.id);
                      } else {
                        onSelectMemo?.(memo);
                      }
                    }}
                    variant="normal"
                    isSelected={selectedMemo?.id === memo.id}
                    showEditDate={showEditDate}
                  />
                );
              })}
          </ItemGrid>
        ) : (
          <EmptyState message="メモがありません" />
        )}
      </>
    );
  }

  // タスクタブ（未着手、進行中、完了）
  if ((activeTab === "todo" ||
    activeTab === "in_progress" ||
    activeTab === "completed") &&
    currentMode === "task") {
    return (
      <TaskStatusDisplay
        activeTab={activeTab}
        tasks={tasks}
        viewMode={viewMode}
        effectiveColumnCount={effectiveColumnCount}
        selectionMode={selectionMode}
        checkedTasks={checkedTasks}
        onToggleCheck={onToggleCheckTask}
        onSelectTask={onSelectTask}
        selectedTaskId={selectedTask?.status === activeTab ? selectedTask?.id : undefined}
        sortOptions={sortOptions}
        showEditDate={showEditDate}
      />
    );
  }

  // 削除済みタブ
  if (activeTab === "deleted") {
    return (
      <>
        {currentMode === "memo" ? (
          deletedNotes && deletedNotes.length > 0 ? (
            <ItemGrid
              viewMode={viewMode}
              effectiveColumnCount={effectiveColumnCount}
            >
              {deletedNotes
                .sort((a, b) => b.deletedAt - a.deletedAt) // 削除時刻順（新しい順）
                .map((memo: DeletedMemo) => {
                  const Component =
                    viewMode === "card" ? MemoCard : MemoListItem;
                  return (
                    <Component
                      key={memo.id}
                      memo={memo}
                      isChecked={checkedDeletedMemos?.has(memo.id) || false}
                      onToggleCheck={() => onToggleCheckDeletedMemo?.(memo.id)}
                      onSelect={() => {
                        if (selectionMode === "check") {
                          onToggleCheckDeletedMemo?.(memo.id);
                        } else {
                          onSelectDeletedMemo?.(memo);
                        }
                      }}
                      variant="deleted"
                      isSelected={selectedDeletedMemo?.id === memo.id}
                      showEditDate={showEditDate}
                    />
                  );
                })}
            </ItemGrid>
          ) : (
            <EmptyState message="削除済みメモはありません" />
          )
        ) : (
          <DeletedTaskDisplay
            deletedTasks={deletedTasks}
            viewMode={viewMode}
            effectiveColumnCount={effectiveColumnCount}
            selectionMode={selectionMode}
            checkedTasks={checkedDeletedTasks}
            onToggleCheck={onToggleCheckDeletedTask}
            onSelectTask={onSelectDeletedTask}
            selectedTaskId={selectedDeletedTask?.id}
            showEditDate={showEditDate}
            sortOptions={sortOptions}
          />
        )}
      </>
    );
  }

  return null;
}

export default DesktopLower;