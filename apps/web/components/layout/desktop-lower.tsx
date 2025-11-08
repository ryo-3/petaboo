"use client";

import MemoStatusDisplay, {
  DeletedMemoDisplay,
} from "@/components/features/memo/memo-status-display";
import TaskStatusDisplay, {
  DeletedTaskDisplay,
} from "@/components/features/task/task-status-display";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";

interface DesktopLowerProps {
  currentMode: "memo" | "task";
  activeTab: "normal" | "deleted" | "todo" | "in_progress" | "completed";
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

  // Board filter
  selectedBoardIds?: number[];
  boardFilterMode?: "include" | "exclude";

  // Tag filter
  selectedTagIds?: number[];
  tagFilterMode?: "include" | "exclude";

  // Data props
  memos?: Memo[];
  localMemos?: Memo[];
  deletedMemos?: DeletedMemo[];
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

  // チームモード
  teamMode?: boolean;
  teamId?: number;

  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allBoards?: Board[];
  allTaggings?: Tagging[];
  allTeamTaggings?: Tagging[]; // チーム用タグ情報
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

function DesktopLower({
  currentMode,
  activeTab,
  effectiveColumnCount,
  isLoading,
  error,
  selectionMode = "select",
  sortOptions = [],
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
  localMemos,
  deletedMemos,
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
  teamMode = false,
  teamId,
  allTags,
  allBoards,
  allTaggings,
  allTeamTaggings = [],
  allBoardItems,
}: DesktopLowerProps) {
  const showBoardName = true;
  const showTags = true;
  // Loading/Error state を削除 - placeholderDataで即座に画面を表示

  // デバッグログ
  console.log("📊 DesktopLower - フィルター状態:", {
    selectedTagIds,
    tagFilterMode,
    selectedBoardIds,
    boardFilterMode,
    currentMode,
    activeTab,
  });

  // メモの通常タブ
  if (activeTab === "normal" && currentMode === "memo") {
    return (
      <>
        <MemoStatusDisplay
          memos={localMemos}
          effectiveColumnCount={effectiveColumnCount}
          selectionMode={selectionMode}
          checkedMemos={checkedMemos}
          onToggleCheck={onToggleCheckMemo}
          onSelectMemo={onSelectMemo}
          selectedMemoId={selectedMemo?.id}
          showBoardName={showBoardName}
          showTags={showTags}
          selectedBoardIds={selectedBoardIds}
          boardFilterMode={boardFilterMode}
          selectedTagIds={selectedTagIds}
          tagFilterMode={tagFilterMode}
          sortOptions={
            sortOptions.filter(
              (opt) =>
                opt.id === "createdAt" ||
                opt.id === "updatedAt" ||
                opt.id === "deletedAt",
            ) as Array<{
              id: "createdAt" | "updatedAt" | "deletedAt";
              label: string;
              enabled: boolean;
              direction: "asc" | "desc";
            }>
          }
          teamMode={teamMode}
          // 全データ事前取得（ちらつき解消）
          allTags={allTags}
          allBoards={allBoards}
          allTaggings={allTaggings}
          allBoardItems={allBoardItems}
        />
      </>
    );
  }

  // タスクタブ（未着手、進行中、完了）
  if (
    (activeTab === "todo" ||
      activeTab === "in_progress" ||
      activeTab === "completed") &&
    currentMode === "task"
  ) {
    return (
      <TaskStatusDisplay
        activeTab={activeTab}
        tasks={tasks}
        effectiveColumnCount={effectiveColumnCount}
        selectionMode={selectionMode}
        checkedTasks={checkedTasks}
        onToggleCheck={onToggleCheckTask}
        onSelectTask={onSelectTask}
        selectedTaskId={
          selectedTask?.status === activeTab ? selectedTask?.id : undefined
        }
        sortOptions={sortOptions}
        showBoardName={showBoardName}
        showTags={showTags}
        selectedBoardIds={selectedBoardIds}
        boardFilterMode={boardFilterMode}
        selectedTagIds={selectedTagIds}
        tagFilterMode={tagFilterMode}
        teamMode={teamMode}
        teamId={teamId}
        allTags={allTags}
        allTaggings={allTaggings}
        allTeamTaggings={allTeamTaggings}
        allBoardItems={allBoardItems}
      />
    );
  }

  // 削除済みタブ
  if (activeTab === "deleted") {
    return (
      <>
        {currentMode === "memo" ? (
          <>
            <DeletedMemoDisplay
              deletedMemos={deletedMemos}
              effectiveColumnCount={effectiveColumnCount}
              selectionMode={selectionMode}
              checkedMemos={checkedDeletedMemos}
              onToggleCheck={onToggleCheckDeletedMemo}
              onSelectMemo={onSelectDeletedMemo}
              selectedMemoId={selectedDeletedMemo?.id}
              showBoardName={showBoardName}
              showTags={showTags}
              selectedBoardIds={selectedBoardIds}
              boardFilterMode={boardFilterMode}
              sortOptions={
                sortOptions.filter(
                  (opt) =>
                    opt.id === "createdAt" ||
                    opt.id === "updatedAt" ||
                    opt.id === "deletedAt",
                ) as Array<{
                  id: "createdAt" | "updatedAt" | "deletedAt";
                  label: string;
                  enabled: boolean;
                  direction: "asc" | "desc";
                }>
              }
              teamMode={teamMode}
              allTags={allTags}
              allBoards={allBoards}
              allTaggings={allTaggings}
              allBoardItems={allBoardItems}
            />
          </>
        ) : (
          <DeletedTaskDisplay
            deletedTasks={deletedTasks}
            effectiveColumnCount={effectiveColumnCount}
            selectionMode={selectionMode}
            checkedTasks={checkedDeletedTasks}
            onToggleCheck={onToggleCheckDeletedTask}
            onSelectTask={onSelectDeletedTask}
            selectedTaskId={selectedDeletedTask?.id}
            showBoardName={true}
            showTags={true}
            selectedBoardIds={selectedBoardIds}
            boardFilterMode={boardFilterMode}
            selectedTagIds={selectedTagIds}
            tagFilterMode={tagFilterMode}
            sortOptions={sortOptions}
            allTags={allTags}
            allBoards={allBoards}
            allTaggings={allTaggings}
            allBoardItems={allBoardItems}
          />
        )}
      </>
    );
  }

  return null;
}

export default DesktopLower;
