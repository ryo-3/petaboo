"use client";

import { useState } from "react";

import TrashIcon from "@/components/icons/trash-icon";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import ControlPanel from "@/components/ui/controls/control-panel";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";

interface DesktopUpperProps {
  currentMode: "memo" | "task" | "board";
  activeTab: "normal" | "deleted" | "todo" | "in_progress" | "completed";
  onTabChange: (
    tab: "normal" | "deleted" | "todo" | "in_progress" | "completed",
  ) => void;
  onCreateNew: () => void;
  viewMode: "card" | "list";
  onViewModeChange: (viewMode: "card" | "list") => void;
  columnCount: number;
  onColumnCountChange: (count: number) => void;
  rightPanelMode: "hidden" | "view" | "create";
  // Custom title override
  customTitle?: string;
  // Board specific props
  boardDescription?: string | null;
  boardId?: number;
  onBoardExport?: () => void;
  onBoardSettings?: () => void;
  isExportDisabled?: boolean;
  // Custom margin bottom
  marginBottom?: string;
  // Custom margin bottom for internal header
  headerMarginBottom?: string;
  // Board layout control
  boardLayout?: "horizontal" | "vertical";
  isReversed?: boolean;
  onBoardLayoutChange?: (layout: "horizontal" | "vertical") => void;
  // Content filter control (board mode only)
  showMemo?: boolean;
  showTask?: boolean;
  showComment?: boolean;
  onMemoToggle?: (show: boolean) => void;
  onTaskToggle?: (show: boolean) => void;
  onCommentToggle?: (show: boolean) => void;
  // Right panel mode for tooltip context
  contentFilterRightPanelMode?: "memo-list" | "task-list" | "editor" | null;
  // 選択時モード用
  isSelectedMode?: boolean;
  listTooltip?: string;
  detailTooltip?: string;
  selectedItemType?: "memo" | "task" | null;
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
    }>,
  ) => void;
  // Date display toggle
  showEditDate?: boolean;
  onShowEditDateChange?: (show: boolean) => void;
  // Board name display toggle (memo only)
  showBoardName?: boolean;
  onShowBoardNameChange?: (show: boolean) => void;
  // Tag display toggle (memo and task)
  showTagDisplay?: boolean;
  onShowTagDisplayChange?: (show: boolean) => void;
  // Board filter props
  boards?: Array<{ id: number; name: string }>;
  selectedBoardIds?: number[];
  onBoardFilterChange?: (boardIds: number[]) => void;
  // Board filter mode
  filterMode?: "include" | "exclude";
  onFilterModeChange?: (mode: "include" | "exclude") => void;
  // Tag filter props
  tags?: Array<{ id: number; name: string; color?: string }>;
  selectedTagIds?: number[];
  onTagFilterChange?: (tagIds: number[]) => void;
  // Tag filter mode
  tagFilterMode?: "include" | "exclude";
  onTagFilterModeChange?: (mode: "include" | "exclude") => void;
  // Tab counts
  normalCount: number;
  deletedMemosCount?: number;
  deletedTasksCount?: number;
  deletedCount?: number;
  todoCount?: number;
  inProgressCount?: number;
  completedCount?: number;
  // Hide add button (for board right panel usage)
  hideAddButton?: boolean;
  // CSV import callback (memo mode only)
  onCsvImport?: () => void;
  // Team mode (reverse layout for team memo list)
  teamMode?: boolean;
  // Hide controls (for when controls are in header)
  hideControls?: boolean;
  // Float controls (position absolute)
  floatControls?: boolean;
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
  customTitle,
  boardDescription,
  boardId,
  onBoardExport,
  onBoardSettings,
  isExportDisabled = false,
  marginBottom = "mb-1.5",
  headerMarginBottom = "",
  boardLayout = "horizontal",
  isReversed = false,
  onBoardLayoutChange,
  showMemo = true,
  showTask = true,
  showComment = true,
  onMemoToggle,
  onTaskToggle,
  onCommentToggle,
  contentFilterRightPanelMode,
  isSelectedMode = false,
  listTooltip,
  detailTooltip,
  selectedItemType = null,
  selectionMode = "select",
  onSelectionModeChange,
  onSelectAll,
  isAllSelected = false,
  sortOptions = [],
  onSortChange,
  showEditDate = false,
  onShowEditDateChange,
  showBoardName = false,
  onShowBoardNameChange,
  showTagDisplay = false,
  onShowTagDisplayChange,
  boards = [],
  selectedBoardIds = [],
  onBoardFilterChange,
  filterMode = "include",
  onFilterModeChange,
  tags = [],
  selectedTagIds = [],
  onTagFilterChange,
  tagFilterMode = "include",
  onTagFilterModeChange,
  normalCount,
  deletedMemosCount = 0,
  deletedTasksCount = 0,
  deletedCount = 0,
  todoCount = 0,
  inProgressCount = 0,
  completedCount = 0,
  hideAddButton = false,
  onCsvImport,
  teamMode = false,
  hideControls = false,
  floatControls = false,
}: DesktopUpperProps) {
  const { preferences } = useUserPreferences(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // タブ設定
  const getTabsConfig = () => {
    if (currentMode === "task") {
      return [
        { id: "todo", label: "未着手", count: todoCount },
        { id: "in_progress", label: "進行中", count: inProgressCount },
        { id: "completed", label: "完了", count: completedCount },
        {
          id: "deleted",
          label: "",
          icon: <TrashIcon className="w-4 h-4" />,
          count: deletedTasksCount,
        },
      ];
    }
    if (currentMode === "board") {
      return [
        { id: "normal", label: "通常", count: normalCount },
        { id: "completed", label: "完了", count: completedCount },
        {
          id: "deleted",
          label: "",
          icon: <TrashIcon className="w-4 h-4" />,
          count: deletedCount || 0,
        },
      ];
    }
    return [
      { id: "normal", label: "通常", count: normalCount },
      {
        id: "deleted",
        label: "",
        icon: <TrashIcon className="w-4 h-4" />,
        count: deletedMemosCount,
      },
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
        normal: "bg-gray-200",
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
  const renderTabContent = (
    tab: { id: string; label: string; count: number; icon?: React.ReactNode },
    isActive: boolean,
  ) => {
    if (tab.icon) {
      return (
        <>
          {tab.icon}
          <span
            className={`text-xs transition-all overflow-hidden text-right ${
              isActive
                ? "opacity-100 w-9 translate-x-0 px-1.5 ml-1"
                : "opacity-0 w-0 translate-x-2 px-0"
            }`}
          >
            {tab.count}
          </span>
        </>
      );
    }
    return (
      <>
        <div
          className={`w-2.5 h-2.5 rounded-full ${getTabColor(tab.id)}`}
        ></div>
        {!(teamMode && rightPanelMode === "view") && <span>{tab.label}</span>}
        <span
          className={`bg-white/20 text-xs px-1.5 py-0.5 rounded-full text-right ${teamMode ? "" : "w-9"}`}
        >
          {tab.count}
        </span>
      </>
    );
  };

  const tabs = getTabsConfig();

  // ヘッダー部分のJSX
  const headerContent = (
    <div className={`flex justify-between items-center ${headerMarginBottom}`}>
      <div className="flex items-center gap-2">
        {!customTitle && !teamMode && (
          <>
            <h1 className="font-bold text-gray-800 text-[22px] w-[105px] truncate">
              {currentMode === "memo"
                ? "メモ一覧"
                : currentMode === "task"
                  ? "タスク一覧"
                  : "ボード一覧"}
            </h1>

            {/* 新規追加ボタン（個人モードはヘッダー部分に表示） */}
            {!hideAddButton && (
              <AddItemButton
                itemType={currentMode}
                onClick={onCreateNew}
                position="bottom"
                size="small"
                showTooltip={false}
                customSize={{
                  padding: "p-2",
                  iconSize: "w-3.5 h-3.5",
                }}
              />
            )}
          </>
        )}

        {/* タブ（boardモード以外） */}
        {currentMode !== "board" && (
          <div className={`flex items-center gap-2 ${!teamMode ? "ml-2" : ""}`}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const tabClass = tab.icon
                ? "pl-1.5 pr-1.5 py-1.5 md:pl-2 md:pr-2 md:py-2"
                : "gap-1 md:gap-1.5 px-1.5 py-1 md:px-2 md:py-1.5";

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
                        | "completed",
                    )
                  }
                  className={`flex items-center ${tabClass} rounded-lg font-medium transition-colors text-gray-600 text-[11px] md:text-[13px] ${getTabBackgroundClass(tab.id, isActive)}`}
                >
                  {renderTabContent(tab, isActive)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // コントロール部分のJSX
  const shouldHideControls =
    (currentMode === "memo" && preferences?.memoHideControls) ||
    (currentMode === "task" && preferences?.taskHideControls);

  const controlsContent = !shouldHideControls ? (
    <ControlPanel
      currentMode={currentMode}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      columnCount={columnCount}
      onColumnCountChange={onColumnCountChange}
      rightPanelMode={rightPanelMode}
      floatControls={floatControls}
      hideControls={hideControls}
      selectionMode={selectionMode}
      onSelectionModeChange={onSelectionModeChange}
      onSelectAll={onSelectAll}
      isAllSelected={isAllSelected}
      boardId={boardId}
      onBoardSettings={onBoardSettings}
      boardLayout={boardLayout}
      isReversed={isReversed}
      onBoardLayoutChange={onBoardLayoutChange}
      showMemo={showMemo}
      showTask={showTask}
      showComment={showComment}
      onMemoToggle={onMemoToggle}
      onTaskToggle={onTaskToggle}
      onCommentToggle={onCommentToggle}
      contentFilterRightPanelMode={contentFilterRightPanelMode}
      isSelectedMode={isSelectedMode}
      listTooltip={listTooltip}
      detailTooltip={detailTooltip}
      selectedItemType={selectedItemType}
      sortOptions={sortOptions}
      onSortChange={onSortChange}
      showEditDate={showEditDate}
      onShowEditDateChange={onShowEditDateChange}
      showBoardName={showBoardName}
      onShowBoardNameChange={onShowBoardNameChange}
      showTagDisplay={showTagDisplay}
      onShowTagDisplayChange={onShowTagDisplayChange}
      boards={boards}
      selectedBoardIds={selectedBoardIds}
      onBoardFilterChange={onBoardFilterChange}
      filterMode={filterMode}
      onFilterModeChange={onFilterModeChange}
      tags={tags}
      selectedTagIds={selectedTagIds}
      onTagFilterChange={onTagFilterChange}
      tagFilterMode={tagFilterMode}
      onTagFilterModeChange={onTagFilterModeChange}
      onCsvImport={onCsvImport}
      onBoardExport={onBoardExport}
      isExportDisabled={isExportDisabled}
      teamMode={teamMode}
      activeTab={activeTab}
      normalCount={normalCount}
      deletedMemosCount={deletedMemosCount}
      deletedTasksCount={deletedTasksCount}
      deletedCount={deletedCount}
      todoCount={todoCount}
      inProgressCount={inProgressCount}
      completedCount={completedCount}
      customTitle={customTitle}
      hideAddButton={hideAddButton}
    />
  ) : null;

  return (
    <div className={`sticky md:static top-2 z-10 bg-white ${marginBottom}`}>
      {teamMode ? (
        <>
          {!hideControls && controlsContent}
          {headerContent}
        </>
      ) : (
        <>
          {headerContent}
          {!hideControls && controlsContent}
        </>
      )}
    </div>
  );
}

export default DesktopUpper;
