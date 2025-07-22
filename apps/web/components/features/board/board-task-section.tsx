'use client';

import TaskStatusDisplay from "@/components/features/task/task-status-display";
import { FilterIconCheckList } from "@/components/icons/filter-icon-variants";
import TrashIcon from "@/components/icons/trash-icon";
import CheckSquareIcon from "@/components/icons/check-square-icon";
import SquareIcon from "@/components/icons/square-icon";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import SortToggle from "@/components/ui/buttons/sort-toggle";
import { BoardItemWithContent } from "@/src/types/board";
import { Task } from "@/src/types/task";
import { useSortOptions } from "@/hooks/use-sort-options";

interface BoardTaskSectionProps {
  rightPanelMode: "editor" | "memo-list" | "task-list" | null;
  showTask: boolean;
  allTaskItems: BoardItemWithContent[];
  taskItems: BoardItemWithContent[];
  activeTaskTab: "todo" | "in_progress" | "completed" | "deleted";
  todoCount: number;
  inProgressCount: number;
  completedCount: number;
  deletedCount: number;
  showTabText: boolean;
  isLoading: boolean;
  effectiveColumnCount: number;
  viewMode: "card" | "list";
  showEditDate: boolean;
  selectedTask?: Task | null;
  // 複数選択関連
  taskSelectionMode: "select" | "check";
  checkedTasks: Set<number>;
  onCreateNewTask: () => void;
  onSetRightPanelMode: (mode: "task-list" | null) => void;
  onTaskTabChange: (tab: "todo" | "in_progress" | "completed" | "deleted") => void;
  onSelectTask: (task: Task) => void;
  onTaskSelectionModeChange: (mode: "select" | "check") => void;
  onTaskSelectionToggle: (taskId: number) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

export default function BoardTaskSection({
  rightPanelMode,
  showTask,
  allTaskItems,
  taskItems,
  activeTaskTab,
  todoCount,
  inProgressCount,
  completedCount,
  deletedCount,
  showTabText,
  isLoading,
  effectiveColumnCount,
  viewMode,
  showEditDate,
  selectedTask,
  taskSelectionMode,
  checkedTasks,
  onCreateNewTask,
  onSetRightPanelMode,
  onTaskTabChange,
  onSelectTask,
  onTaskSelectionModeChange,
  onTaskSelectionToggle,
  onSelectAll,
  isAllSelected,
}: BoardTaskSectionProps) {
  // ソートオプションの管理
  const { setSortOptions, getVisibleSortOptions } = useSortOptions("task");

  if (rightPanelMode === "memo-list" || !showTask) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-1">
            タスク
          </h2>
          <span className="font-normal text-gray-500">
            {allTaskItems.length}
          </span>
          <Tooltip text="新規追加" position="top">
            <AddItemButton
              itemType="task"
              onClick={onCreateNewTask}
              size="small"
              showTooltip={false}
              customSize={{
                padding: "p-1",
                iconSize: "size-5",
              }}
              className="size-6 flex items-center justify-center"
            />
          </Tooltip>
          <Tooltip text={rightPanelMode === "task-list" ? "タスク一覧非表示" : "タスク一覧表示"} position="top">
            <button
              onClick={() => onSetRightPanelMode(rightPanelMode === "task-list" ? null : "task-list")}
              className={`size-6 flex items-center justify-center rounded-lg transition-colors ${
                rightPanelMode === "task-list" 
                  ? "bg-gray-100 hover:bg-gray-200" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <FilterIconCheckList className={`size-5 ${
                rightPanelMode === "task-list" ? "text-DeepBlue" : "text-gray-600"
              }`} />
            </button>
          </Tooltip>


          
          {/* ソートトグル */}
          <SortToggle
            sortOptions={getVisibleSortOptions(activeTaskTab)}
            onSortChange={setSortOptions}
            buttonSize="size-6"
            iconSize="size-4"
          />
        </div>
      </div>

      {/* タスクステータスタブ */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* 全選択/全解除ボタン（チェックモード時のみ表示） */}
        {taskSelectionMode === "check" && onSelectAll && (
          <Tooltip
            text={isAllSelected ? "全解除" : "全選択"}
            position="bottom"
          >
            <button
              onClick={onSelectAll}
              className="bg-gray-100 rounded-lg size-7 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
            >
              {isAllSelected ? (
                <SquareIcon className="size-5" />
              ) : (
                <CheckSquareIcon className="size-5" />
              )}
            </button>
          </Tooltip>
        )}
        
        <button
          onClick={() => onTaskTabChange("todo")}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
            activeTaskTab === "todo"
              ? "bg-zinc-200"
              : "bg-gray-100 hover:bg-zinc-200"
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400"></div>
          {showTabText && <span>未着手</span>}
          <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
            {todoCount}
          </span>
        </button>
        <button
          onClick={() => onTaskTabChange("in_progress")}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
            activeTaskTab === "in_progress"
              ? "bg-blue-100"
              : "bg-gray-100 hover:bg-blue-100"
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-Blue"></div>
          {showTabText && <span>進行中</span>}
          <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
            {inProgressCount}
          </span>
        </button>
        <button
          onClick={() => onTaskTabChange("completed")}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
            activeTaskTab === "completed"
              ? "bg-Green/20"
              : "bg-gray-100 hover:bg-Green/20"
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-Green"></div>
          {showTabText && <span>完了</span>}
          <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
            {completedCount}
          </span>
        </button>
        <button
          onClick={() => onTaskTabChange("deleted")}
          className={`flex items-center px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
            activeTaskTab === "deleted"
              ? "bg-red-100"
              : "bg-gray-100 hover:bg-red-100"
          }`}
        >
          <TrashIcon className="w-4 h-4" />
          <span
            className={`text-xs transition-all overflow-hidden text-right ${
              activeTaskTab === "deleted"
                ? "opacity-100 w-9 translate-x-0 px-2 ml-1"
                : "opacity-0 w-0 translate-x-2 px-0"
            }`}
          >
            {deletedCount}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-10 mb-2">
        {isLoading || (allTaskItems.length === 0 && taskItems.length === 0) ? (
          <div className="text-gray-500 text-center py-8">
            タスクを読み込み中...
          </div>
        ) : taskItems.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {activeTaskTab === "deleted"
              ? "削除済みタスクがありません"
              : "タスクがありません"}
          </div>
        ) : activeTaskTab === "deleted" ? (
          // 削除済みタスク用の表示（将来実装予定）
          <div className="text-gray-500 text-center py-8">
            削除済みタスクがありません
          </div>
        ) : (
          <TaskStatusDisplay
            activeTab={activeTaskTab as "todo" | "in_progress" | "completed"}
            tasks={taskItems.map(item => item.content as Task)}
            viewMode={viewMode}
            effectiveColumnCount={effectiveColumnCount}
            selectionMode={taskSelectionMode}
            checkedTasks={checkedTasks}
            onToggleCheck={onTaskSelectionToggle}
            onSelectTask={taskSelectionMode === "check" ? undefined : onSelectTask}
            selectedTaskId={taskSelectionMode === "check" ? undefined : selectedTask?.id}
            showEditDate={showEditDate}
            sortOptions={getVisibleSortOptions(activeTaskTab)}
          />
        )}
      </div>
    </div>
  );
}