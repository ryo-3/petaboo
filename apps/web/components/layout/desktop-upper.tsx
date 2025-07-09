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

  // タブ設定
  const getTabsConfig = () => {
    if (currentMode === "task") {
      return [
        { id: "todo", label: "未着手", count: todoCount },
        { id: "in_progress", label: "進行中", count: inProgressCount },
        { id: "completed", label: "完了", count: completedCount },
        { id: "deleted", label: "", icon: <TrashIcon className="w-4 h-4" />, count: deletedTasksCount },
      ];
    }
    return [
      { id: "normal", label: "通常", count: normalCount },
      { id: "deleted", label: "", icon: <TrashIcon className="w-4 h-4" />, count: deletedNotesCount },
    ];
  };

  // タブの色設定
  const getTabColor = (tabId: string) => {
    const colorMap = {
      todo: "bg-zinc-400",
      in_progress: "bg-Blue",
      completed: "bg-Green",
      deleted: "bg-red-600",
      normal: "bg-zinc-500",
    };
    return colorMap[tabId as keyof typeof colorMap] || "bg-gray-500";
  };

  // タブの背景色設定
  const getTabBackgroundClass = (tabId: string, isActive: boolean) => {
    const baseClass = "bg-gray-100";
    
    if (isActive) {
      const activeColors = {
        todo: "bg-zinc-200",
        in_progress: "bg-blue-100",
        completed: "bg-Green/20",
        deleted: "bg-red-100",
        normal: "bg-gray-100",
      };
      return activeColors[tabId as keyof typeof activeColors] || "bg-gray-100";
    }
    
    const hoverColors = {
      todo: "hover:bg-zinc-200",
      in_progress: "hover:bg-blue-100",
      completed: "hover:bg-Green/20",
      deleted: "hover:bg-red-100",
      normal: "hover:bg-gray-200",
    };
    return `${baseClass} ${hoverColors[tabId as keyof typeof hoverColors] || "hover:bg-gray-200"}`;
  };

  // タブの内容をレンダリング
  const renderTabContent = (tab: { id: string; label: string; count: number; icon?: React.ReactNode }, isActive: boolean) => {
    if (tab.icon) {
      return (
        <>
          {tab.icon}
          <span 
            className={`text-xs transition-all overflow-hidden ${
              isActive 
                ? 'opacity-100 w-9 translate-x-0 px-1.5 ml-1' 
                : 'opacity-0 w-0 translate-x-2 px-0'
            }`}
          >
            {tab.count}
          </span>
        </>
      );
    }
    return (
      <>
        <div className={`w-3 h-3 rounded-full ${getTabColor(tab.id)}`}></div>
        <span>{tab.label}</span>
        <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full w-9">
          {tab.count}
        </span>
      </>
    );
  };

  const tabs = getTabsConfig();

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
              const isActive = activeTab === tab.id;
              const tabClass = tab.icon 
                ? 'pl-2 pr-2 py-2'
                : 'gap-2 px-2.5 py-1.5';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as "normal" | "deleted" | "todo" | "in_progress" | "completed")}
                  className={`flex items-center ${tabClass} rounded-lg text-sm font-medium transition-colors text-gray-600 ${getTabBackgroundClass(tab.id, isActive)}`}
                >
                  {renderTabContent(tab, isActive)}
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
