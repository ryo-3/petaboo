"use client";

import MemoStatusDisplay, { DeletedMemoDisplay } from "@/components/features/memo/memo-status-display";
import TaskStatusDisplay, { DeletedTaskDisplay } from "@/components/features/task/task-status-display";
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
  
  // Sort options (task and memo)
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "dueDate" | "priority" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  
  // Date display toggle (task and memo)
  showEditDate?: boolean;
  
  // Board name display toggle (memo only)
  showBoardName?: boolean;
  
  // Board filter
  selectedBoardIds?: number[];
  boardFilterMode?: 'include' | 'exclude';
  
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
  showBoardName = false,
  selectedBoardIds = [],
  boardFilterMode = 'include',
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
        <MemoStatusDisplay
          memos={localMemos}
          viewMode={viewMode}
          effectiveColumnCount={effectiveColumnCount}
          selectionMode={selectionMode}
          checkedMemos={checkedMemos}
          onToggleCheck={onToggleCheckMemo}
          onSelectMemo={onSelectMemo}
          selectedMemoId={selectedMemo?.id}
          showEditDate={showEditDate}
          showBoardName={showBoardName}
          selectedBoardIds={selectedBoardIds}
          boardFilterMode={boardFilterMode}
          sortOptions={sortOptions.filter(opt => 
            opt.id === "createdAt" || opt.id === "updatedAt" || opt.id === "deletedAt"
          ) as Array<{
            id: "createdAt" | "updatedAt" | "deletedAt";
            label: string;
            enabled: boolean;
            direction: "asc" | "desc";
          }>}
        />
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
        showBoardName={showBoardName}
        selectedBoardIds={selectedBoardIds}
        boardFilterMode={boardFilterMode}
      />
    );
  }

  // 削除済みタブ
  if (activeTab === "deleted") {
    return (
      <>
        {currentMode === "memo" ? (
          <DeletedMemoDisplay
            deletedMemos={deletedNotes}
            viewMode={viewMode}
            effectiveColumnCount={effectiveColumnCount}
            selectionMode={selectionMode}
            checkedMemos={checkedDeletedMemos}
            onToggleCheck={onToggleCheckDeletedMemo}
            onSelectMemo={onSelectDeletedMemo}
            selectedMemoId={selectedDeletedMemo?.id}
            showEditDate={showEditDate}
            showBoardName={showBoardName}
            selectedBoardIds={selectedBoardIds}
            boardFilterMode={boardFilterMode}
            sortOptions={sortOptions.filter(opt => 
            opt.id === "createdAt" || opt.id === "updatedAt" || opt.id === "deletedAt"
          ) as Array<{
            id: "createdAt" | "updatedAt" | "deletedAt";
            label: string;
            enabled: boolean;
            direction: "asc" | "desc";
          }>}
          />
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
            showBoardName={showBoardName}
            selectedBoardIds={selectedBoardIds}
            boardFilterMode={boardFilterMode}
            sortOptions={sortOptions}
          />
        )}
      </>
    );
  }

  return null;
}

export default DesktopLower;