"use client";

import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import ViewModeToggle from "@/components/ui/layout/view-mode-toggle";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo } from "@/src/types/memo";
import type { DeletedTask } from "@/src/types/task";

interface DesktopUpperProps {
  currentMode: "memo" | "task";
  activeTab: "normal" | "deleted" | "todo" | "in_progress" | "completed";
  onTabChange: (tab: "normal" | "deleted" | "todo" | "in_progress" | "completed") => void;
  onCreateNew: () => void;
  viewMode: "card" | "list";
  onViewModeChange: (viewMode: "card" | "list") => void;
  columnCount: number;
  onColumnCountChange: (count: number) => void;
  rightPanelMode: "hidden" | "view" | "create";
  // Tab counts
  normalCount: number;
  deletedNotesCount?: number;
  deletedTasksCount?: number;
  todoCount?: number;
  inProgressCount?: number;
  completedCount?: number;
  // Bulk actions
  checkedCount?: number;
  onBulkDelete?: () => void;
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
  normalCount,
  deletedNotesCount = 0,
  deletedTasksCount = 0,
  todoCount = 0,
  inProgressCount = 0,
  completedCount = 0,
  checkedCount = 0,
  onBulkDelete,
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
              const getTabColors = () => {
                if (activeTab === tab.id) {
                  switch (tab.id) {
                    case "todo":
                      return "bg-zinc-500 text-white";
                    case "in_progress":
                      return "bg-blue-600 text-white";
                    case "completed":
                      return "bg-green-600 text-white";
                    case "deleted":
                      return "bg-red-600 text-white";
                    case "normal":
                      return "bg-zinc-500 text-white";
                    default:
                      return "bg-gray-500 text-white";
                  }
                } else {
                  switch (tab.id) {
                    case "todo":
                      return "bg-gray-100 text-gray-600 hover:bg-gray-300";
                    case "in_progress":
                      return "bg-gray-100 text-gray-600 hover:bg-blue-200";
                    case "completed":
                      return "bg-gray-100 text-gray-600 hover:bg-green-200";
                    case "deleted":
                      return "bg-gray-100 text-gray-600 hover:bg-red-200";
                    case "normal":
                      return "bg-gray-100 text-gray-600 hover:bg-gray-300";
                    default:
                      return "bg-gray-100 text-gray-600 hover:bg-gray-300";
                  }
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${getTabColors()}`}
                >
                  {tab.icon && tab.icon}
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
        <div className="flex items-center gap-2">
          {/* 一括削除ボタン */}
          {checkedCount > 0 && onBulkDelete && (
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              削除 ({checkedCount})
            </button>
          )}
          
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
          <ColumnCountSelector
            columnCount={columnCount}
            onColumnCountChange={onColumnCountChange}
            isRightPanelShown={rightPanelMode !== "hidden"}
          />
        </div>
      )}
    </div>
  );
}

export default DesktopUpper;