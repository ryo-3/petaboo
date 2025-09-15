"use client";

import TaskStatusDisplay, {
  DeletedTaskDisplay,
} from "@/components/features/task/task-status-display";
import { DeletedTask } from "@/src/types/task";
import { FilterIconCheckList } from "@/components/icons/filter-icon-variants";
import TrashIcon from "@/components/icons/trash-icon";
import CheckSquareIcon from "@/components/icons/check-square-icon";
import SquareIcon from "@/components/icons/square-icon";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import SelectionMenuButton from "@/components/ui/buttons/selection-menu-button";
import SortToggle from "@/components/ui/buttons/sort-toggle";
import { BoardItemWithContent } from "@/src/types/board";
import { Task } from "@/src/types/task";
import { useSortOptions } from "@/hooks/use-sort-options";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";

interface BoardTaskSectionProps {
  boardId: number;
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
  showTags?: boolean;
  showBoardName?: boolean;
  selectedTask?: Task | DeletedTask | null;
  teamMode?: boolean;
  teamId?: number | null;
  // 複数選択関連
  taskSelectionMode: "select" | "check";
  checkedTasks: Set<string | number>;
  onCreateNewTask: () => void;
  onSetRightPanelMode: (mode: "task-list" | null) => void;
  onTaskTabChange: (
    tab: "todo" | "in_progress" | "completed" | "deleted",
  ) => void;
  onSelectTask: (task: Task | DeletedTask) => void;
  onTaskSelectionToggle: (taskId: string | number) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  onBulkDelete?: (itemType: "task") => void;
  isDeleting?: boolean;
  isLidOpen?: boolean;
  currentDisplayCount?: number;
  deleteButtonRef?: React.RefObject<HTMLButtonElement>;
  // 復元関連
  onCheckedTasksChange?: (tasks: Set<string | number>) => void;

  // 選択メニュー関連
  onExport?: () => void;
  onPin?: () => void;
  onTagging?: () => void;
  onTabMove?: () => void;

  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allBoards?: Board[];
  allTaggings?: Tagging[];
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

import { useRef, useMemo, useState } from "react";
import { BulkActionButtons } from "@/components/ui/layout/bulk-action-buttons";
import { useBulkDeleteButton } from "@/src/hooks/use-bulk-delete-button";
import { useBoardBulkRestore } from "@/src/hooks/use-board-bulk-restore";
import BoardCategoryFilterToggle from "@/components/features/board-categories/board-category-filter-toggle";
import { useBoardCategoryFilter } from "@/src/hooks/use-board-category-filter";

export default function BoardTaskSection({
  boardId,
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
  showTags = false,
  showBoardName = false,
  selectedTask,
  teamMode = false,
  teamId,
  taskSelectionMode,
  checkedTasks,
  onCreateNewTask,
  onSetRightPanelMode,
  onTaskTabChange,
  onSelectTask,
  onTaskSelectionToggle,
  onSelectAll,
  isAllSelected,
  onBulkDelete,
  isDeleting = false,
  isLidOpen = false,
  currentDisplayCount,
  deleteButtonRef: propDeleteButtonRef,
  onCheckedTasksChange,
  onExport,
  onPin,
  onTagging,
  onTabMove,
  allTags = [],
  allBoards = [],
  allTaggings = [],
  allBoardItems = [],
}: BoardTaskSectionProps) {
  // ボードカテゴリーフィルター機能
  const { selectedCategoryIds, setSelectedCategoryIds, filteredTaskItems } =
    useBoardCategoryFilter({ taskItems });

  // フィルタリングされたタスクアイテムを使用
  const displayTaskItems = filteredTaskItems;

  // ソートオプションの管理
  const { setSortOptions, getVisibleSortOptions } = useSortOptions("task");
  const localDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = propDeleteButtonRef || localDeleteButtonRef;

  // 復元状態管理
  const [, setIsRestoring] = useState(false);
  const [isRestoreLidOpen, setIsRestoreLidOpen] = useState(false);

  // 削除ボタン用のチェック済みアイテムSet（ID変換処理）
  const checkedItemsForDeleteButton = useMemo(() => {
    if (activeTaskTab === "deleted") {
      // 削除済みタブ: 全選択で設定されるcontent.idをそのまま使用
      return checkedTasks as Set<number>;
    } else {
      // 通常タブ: 数値のみをフィルタ
      return new Set(
        Array.from(checkedTasks).filter(
          (id) => typeof id === "number",
        ) as number[],
      );
    }
  }, [checkedTasks, activeTaskTab]);

  // 削除ボタンのタイマー制御
  const { showDeleteButton } = useBulkDeleteButton({
    activeTab: activeTaskTab,
    deletedTabName: "deleted",
    checkedItems:
      activeTaskTab === "deleted" ? new Set() : checkedItemsForDeleteButton,
    checkedDeletedItems:
      activeTaskTab === "deleted" ? checkedItemsForDeleteButton : new Set(),
    isDeleting: isDeleting || false,
    isRestoring: isRestoreLidOpen,
  });

  // 表示用のチェック済みアイテムSet（型変換処理）
  const checkedTasksForDisplay = useMemo(() => {
    if (activeTaskTab === "deleted") {
      // 削除済みタブ: 全選択で設定されるcontent.idをそのまま使用
      return checkedTasks as Set<number>;
    } else {
      // 通常タブ: checkedTasksをそのまま使用（number型のSet）
      return checkedTasks as Set<number>;
    }
  }, [checkedTasks, activeTaskTab]);

  // 復元機能フック（削除済みタブでのみ使用）
  const {
    handleBulkRestore,
    RestoreModal,
    restoreButtonRef,
    currentDisplayCount: currentRestoreDisplayCount,
  } = useBoardBulkRestore({
    itemType: "task",
    checkedItems: checkedTasks,
    setCheckedItems: onCheckedTasksChange || (() => {}),
    boardItems: taskItems,
    deletedTasks:
      activeTaskTab === "deleted"
        ? taskItems.map((item) => item.content as DeletedTask)
        : undefined,
    teamMode,
    teamId: teamId || undefined,
    boardId,
    setIsRestoring,
    setIsLidOpen: setIsRestoreLidOpen,
  });

  if (rightPanelMode === "memo-list" || !showTask) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-1">
            タスク
          </h2>
          <span className="font-normal text-gray-500">
            {allTaskItems.length}
          </span>
          <Tooltip text="新規追加" position="bottom">
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
          <Tooltip
            text={
              rightPanelMode === "task-list"
                ? "タスク一覧非表示"
                : "タスク一覧表示"
            }
            position="bottom"
          >
            <button
              onClick={() =>
                onSetRightPanelMode(
                  rightPanelMode === "task-list" ? null : "task-list",
                )
              }
              className={`size-6 flex items-center justify-center rounded-lg transition-colors ${
                rightPanelMode === "task-list"
                  ? "bg-gray-100 hover:bg-gray-200"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <FilterIconCheckList
                className={`size-5 ${
                  rightPanelMode === "task-list"
                    ? "text-DeepBlue"
                    : "text-gray-600"
                }`}
              />
            </button>
          </Tooltip>

          {/* ソートトグル */}
          <SortToggle
            sortOptions={getVisibleSortOptions(activeTaskTab)}
            onSortChange={setSortOptions}
            buttonSize="size-6"
            iconSize="size-4"
          />

          {/* ボードカテゴリー絞り込み */}
          <BoardCategoryFilterToggle
            boardId={boardId}
            selectedCategoryIds={selectedCategoryIds}
            onFilterChange={setSelectedCategoryIds}
            buttonSize="size-6"
            iconSize="size-4"
          />
        </div>
      </div>

      {/* タスクステータスタブ */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* 全選択/全解除ボタン（チェックモード時のみ表示） */}
        {taskSelectionMode === "check" && onSelectAll && (
          <Tooltip text={isAllSelected ? "全解除" : "全選択"} position="bottom">
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
        {isLoading ? (
          <div className="text-gray-500 text-center py-8">
            タスクを読み込み中...
          </div>
        ) : displayTaskItems.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {activeTaskTab === "deleted"
              ? "削除済みタスクがありません"
              : "タスクがありません"}
          </div>
        ) : activeTaskTab === "deleted" ? (
          // 削除済みタスク用の表示
          <DeletedTaskDisplay
            deletedTasks={
              displayTaskItems.map((item) => item.content) as DeletedTask[]
            } // DeletedTask型に変換
            viewMode={viewMode}
            effectiveColumnCount={effectiveColumnCount}
            isBoard={true}
            selectionMode={taskSelectionMode}
            checkedTasks={checkedTasksForDisplay}
            onToggleCheck={(taskId) => {
              // 削除済みタスクの場合、content.idで統一
              onTaskSelectionToggle(taskId);
            }}
            onSelectAll={onSelectAll}
            isAllSelected={isAllSelected}
            onSelectTask={
              taskSelectionMode === "check" ? undefined : onSelectTask
            }
            selectedTaskId={
              taskSelectionMode === "check" ? undefined : selectedTask?.id
            }
            showEditDate={showEditDate}
            showBoardName={showBoardName}
            showTags={showTags}
            sortOptions={getVisibleSortOptions(activeTaskTab)}
            allTags={allTags}
            allBoards={allBoards}
            allTaggings={allTaggings}
            allBoardItems={allBoardItems}
          />
        ) : (
          <TaskStatusDisplay
            activeTab={activeTaskTab as "todo" | "in_progress" | "completed"}
            tasks={displayTaskItems.map((item) => ({
              ...(item.content as Task),
              originalId: item.itemId?.toString() || "", // ボードのitemIdを文字列として使用（undefinedチェック）
            }))}
            viewMode={viewMode}
            effectiveColumnCount={effectiveColumnCount}
            isBoard={true}
            selectionMode={taskSelectionMode}
            checkedTasks={checkedTasksForDisplay}
            onToggleCheck={onTaskSelectionToggle}
            onSelectTask={
              taskSelectionMode === "check" ? undefined : onSelectTask
            }
            selectedTaskId={
              taskSelectionMode === "check" ? undefined : selectedTask?.id
            }
            showEditDate={showEditDate}
            showBoardName={showBoardName}
            showTags={showTags}
            sortOptions={getVisibleSortOptions(activeTaskTab)}
            allTags={allTags}
            allTaggings={allTaggings}
            allBoardItems={allBoardItems}
          />
        )}
      </div>

      {/* 一括削除ボタン - タスク用 */}
      <BulkActionButtons
        showDeleteButton={showDeleteButton}
        deleteButtonCount={(() => {
          const count =
            activeTaskTab === "deleted"
              ? deletedCount
              : currentDisplayCount || checkedTasks.size;

          if (activeTaskTab === "deleted") {
            console.log("🔍 削除ボタンカウント詳細(タスク):", {
              activeTaskTab,
              deletedCount,
              currentDisplayCount,
              checkedTasksSize: checkedTasks.size,
              finalCount: count,
            });
          }

          return count;
        })()}
        onDelete={() => {
          onBulkDelete?.("task");
        }}
        deleteButtonRef={deleteButtonRef}
        isDeleting={isLidOpen}
        deleteVariant={activeTaskTab === "deleted" ? "danger" : undefined}
        showRestoreButton={
          activeTaskTab === "deleted" &&
          !isDeleting &&
          (checkedTasks.size > 0 ||
            (isRestoreLidOpen && currentRestoreDisplayCount > 0))
        }
        restoreCount={checkedTasks.size}
        onRestore={handleBulkRestore}
        restoreButtonRef={restoreButtonRef}
        isRestoring={isRestoreLidOpen}
        animatedRestoreCount={currentRestoreDisplayCount}
        useAnimatedRestoreCount={false}
        animatedDeleteCount={currentDisplayCount}
        useAnimatedDeleteCount={true}
      />

      {/* 復元モーダル */}
      <RestoreModal />

      {/* 選択メニューボタン（通常タブでアイテム選択時） */}
      <SelectionMenuButton
        count={checkedTasks.size}
        onExport={onExport}
        onPin={onPin}
        onTagging={onTagging}
        onTabMove={onTabMove}
        isVisible={
          activeTaskTab !== "deleted" && checkedTasks.size > 0 && !isDeleting
        }
      />
    </div>
  );
}
