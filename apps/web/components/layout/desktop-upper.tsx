"use client";

import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import SelectionModeToggle from "@/components/ui/buttons/selection-mode-toggle";
import SortToggle from "@/components/ui/buttons/sort-toggle";
import EditDateToggle from "@/components/ui/buttons/edit-date-toggle";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import ViewModeToggle from "@/components/ui/layout/view-mode-toggle";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";

interface DesktopUpperProps {
  currentMode: "memo" | "task";
  activeTab: "normal" | "deleted" | "todo" | "in_progress" | "completed";
  onTabChange: (
    tab: "normal" | "deleted" | "todo" | "in_progress" | "completed"
  ) => void;
  onCreateNew: () => void;
  viewMode: "card" | "list";
  onViewModeChange: (viewMode: "card" | "list") => void;
  columnCount: number;
  onColumnCountChange: (count: number) => void;
  rightPanelMode: "hidden" | "view" | "create";
  // Selection mode (memo only)
  selectionMode?: "select" | "check";
  onSelectionModeChange?: (mode: "select" | "check") => void;
  // Select all functionality
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  // Sort options (task and memo)
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "priority" | "deletedAt" | "dueDate";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  onSortChange?: (
    options: Array<{
      id: "createdAt" | "updatedAt" | "priority" | "deletedAt" | "dueDate";
      label: string;
      enabled: boolean;
      direction: "asc" | "desc";
    }>
  ) => void;
  // Date display toggle
  showEditDate?: boolean;
  onShowEditDateChange?: (show: boolean) => void;
  // Tab counts
  normalCount: number;
  deletedNotesCount?: number;
  deletedTasksCount?: number;
  todoCount?: number;
  inProgressCount?: number;
  completedCount?: number;
}

function DesktopUpper({
  currentMode,
  activeTab,
  onTabChange,
  onCreateNew,
  viewMode,
  onViewModeChange,
  columnCount,
  onColumnCountChange,
  rightPanelMode,
  selectionMode = "select",
  onSelectionModeChange,
  onSelectAll,
  isAllSelected = false,
  sortOptions = [],
  onSortChange,
  showEditDate = false,
  onShowEditDateChange,
  normalCount,
  deletedNotesCount = 0,
  deletedTasksCount = 0,
  todoCount = 0,
  inProgressCount = 0,
  completedCount = 0,
}: DesktopUpperProps) {
  const { preferences } = useUserPreferences(1);

  const tabs =
    currentMode === "task"
      ? [
          {
            id: "todo",
            label: "未着手",
            count: todoCount,
          },
          {
            id: "in_progress",
            label: "進行中",
            count: inProgressCount,
          },
          {
            id: "completed",
            label: "完了",
            count: completedCount,
          },
          {
            id: "deleted",
            label: "削除済み",
            icon: <TrashIcon className="w-3 h-3" />,
            count: deletedTasksCount,
          },
        ]
      : [
          {
            id: "normal",
            label: "通常",
            count: normalCount,
          },
          {
            id: "deleted",
            label: "削除済み",
            icon: <TrashIcon className="w-3 h-3" />,
            count: deletedNotesCount,
          },
        ];

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentMode === "memo" ? (
              <MemoIcon className="w-6 h-6 text-gray-600" />
            ) : (
              <TaskIcon className="w-6 h-6 text-gray-600" />
            )}
            <h1 className="text-2xl font-bold text-gray-800 w-[105px]">
              {currentMode === "memo" ? "メモ一覧" : "タスク一覧"}
            </h1>
          </div>

          {/* 新規追加ボタン */}
          <AddItemButton
            itemType={currentMode}
            onClick={onCreateNew}
            position="bottom"
            size="small"
            showTooltip={false}
          />

          {/* タブ */}
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const getTabColor = () => {
                switch (tab.id) {
                  case "todo":
                    return "bg-zinc-400";
                  case "in_progress":
                    return "bg-Blue";
                  case "completed":
                    return "bg-Green";
                  case "deleted":
                    return "bg-red-600";
                  case "normal":
                    return "bg-zinc-500";
                  default:
                    return "bg-gray-500";
                }
              };

              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    onTabChange(
                      tab.id as
                        | "normal"
                        | "deleted"
                        | "todo"
                        | "in_progress"
                        | "completed"
                    )
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-gray-600 ${
                    activeTab === tab.id
                      ? tab.id === "todo"
                        ? "bg-zinc-200"
                        : tab.id === "in_progress"
                          ? "bg-blue-100"
                          : tab.id === "completed"
                            ? "bg-Green/20"
                            : tab.id === "deleted"
                              ? "bg-red-100"
                              : "bg-gray-100"
                      : tab.id === "todo"
                        ? "bg-gray-100 hover:bg-zinc-200"
                        : tab.id === "in_progress"
                          ? "bg-gray-100 hover:bg-blue-100"
                          : tab.id === "completed"
                            ? "bg-gray-100 hover:bg-Green/20"
                            : tab.id === "deleted"
                              ? "bg-gray-100 hover:bg-red-100"
                              : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      activeTab === tab.id ? getTabColor() : getTabColor()
                    }`}
                  ></div>
                  <span>{tab.label}</span>
                  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* コントロール */}
      {!(
        (currentMode === "memo" && preferences?.memoHideControls) ||
        (currentMode === "task" && preferences?.taskHideControls)
      ) && (
        <div className="flex items-center gap-2 h-7">
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            buttonSize="size-7"
            iconSize="size-5"
          />
          <ColumnCountSelector
            columnCount={columnCount}
            onColumnCountChange={onColumnCountChange}
            isRightPanelShown={rightPanelMode !== "hidden"}
            containerHeight="h-7"
            buttonSize="size-6"
          />

          {/* 選択モード切り替え */}
          {onSelectionModeChange && (
            <SelectionModeToggle
              mode={selectionMode}
              onModeChange={onSelectionModeChange}
              buttonSize="size-7"
              iconSize="size-5"
            />
          )}

          {/* 全選択/全解除ボタン（チェックモードのみ） */}
          {selectionMode === "check" && onSelectAll && (
            <button
              onClick={onSelectAll}
              className="h-7 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
            >
              {isAllSelected ? "全解除" : "全選択"}
            </button>
          )}

          {/* 並び替えメニュー */}
          {onSortChange && sortOptions.length > 0 && (
            <SortToggle
              sortOptions={sortOptions}
              onSortChange={onSortChange}
              buttonSize="size-6"
              iconSize="size-4"
            />
          )}

          {/* 編集日表示切り替え */}
          {onShowEditDateChange && (
            <EditDateToggle
              showEditDate={showEditDate}
              onToggle={onShowEditDateChange}
              buttonSize="size-7"
              iconSize="size-4"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default DesktopUpper;
