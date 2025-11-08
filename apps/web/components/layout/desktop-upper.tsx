"use client";

import { useState } from "react";

import TrashIcon from "@/components/icons/trash-icon";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import ControlPanel from "@/components/ui/controls/control-panel";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useViewSettings } from "@/src/contexts/view-settings-context";

interface DesktopUpperProps {
  currentMode: "memo" | "task" | "board";
  activeTab: "normal" | "deleted" | "todo" | "in_progress" | "completed";
  onTabChange: (
    tab: "normal" | "deleted" | "todo" | "in_progress" | "completed",
  ) => void;
  onCreateNew: () => void;
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
  teamId?: number;
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
  teamId,
  hideControls = false,
  floatControls = false,
}: DesktopUpperProps) {
  const { preferences } = useUserPreferences(1);
  const { settings, sessionState, updateSettings, updateSessionState } =
    useViewSettings();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Contextから取得した値を使用
  const columnCount =
    currentMode === "memo"
      ? settings.memoColumnCount
      : currentMode === "task"
        ? settings.taskColumnCount
        : settings.boardColumnCount;
  const onColumnCountChange = (count: number) => {
    if (currentMode === "memo") {
      updateSettings({ memoColumnCount: count });
    } else if (currentMode === "task") {
      updateSettings({ taskColumnCount: count });
    } else {
      updateSettings({ boardColumnCount: count });
    }
  };
  const showTagDisplay = settings.showTagDisplay;
  const onShowTagDisplayChange = (show: boolean) =>
    updateSettings({ showTagDisplay: show });
  const sortOptions = sessionState.sortOptions;
  const onSortChange = (options: typeof sessionState.sortOptions) =>
    updateSessionState({ sortOptions: options });

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
        {/* タブ（boardモード以外） */}
        {currentMode !== "board" && (
          <div className="flex items-center gap-2">
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
  // ボード一覧（customTitle/boardIdなし）ではコントロール非表示、ボード詳細では表示
  const shouldHideControls =
    (currentMode === "board" && !customTitle && !boardId) ||
    (currentMode === "memo" && preferences?.memoHideControls) ||
    (currentMode === "task" && preferences?.taskHideControls);

  const controlsContent = !shouldHideControls ? (
    <ControlPanel
      currentMode={currentMode}
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
      showTagDisplay={showTagDisplay}
      onShowTagDisplayChange={onShowTagDisplayChange}
      onCsvImport={onCsvImport}
      onBoardExport={onBoardExport}
      isExportDisabled={isExportDisabled}
      teamMode={teamMode}
      teamId={teamId}
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
    <div
      className={`fixed md:static top-0 left-0 right-0 z-10 bg-white px-2 md:px-0 ${marginBottom}`}
    >
      {!hideControls && controlsContent}
      {headerContent}
    </div>
  );
}

export default DesktopUpper;
