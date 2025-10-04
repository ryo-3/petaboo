"use client";

import { useEffect, useState, useRef, useMemo } from "react";

import CheckSquareIcon from "@/components/icons/check-square-icon";
import CsvExportIcon from "@/components/icons/csv-export-icon";
import CsvImportIcon from "@/components/icons/csv-import-icon";
import SettingsIcon from "@/components/icons/settings-icon";
import SquareIcon from "@/components/icons/square-icon";
import TrashIcon from "@/components/icons/trash-icon";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import BoardNameToggle from "@/components/ui/buttons/board-name-toggle";
import EditDateToggle from "@/components/ui/buttons/edit-date-toggle";
import SelectionModeToggle from "@/components/ui/buttons/selection-mode-toggle";
import SortToggle from "@/components/ui/buttons/sort-toggle";
import TagDisplayToggle from "@/components/ui/buttons/tag-display-toggle";
import BoardLayoutToggle from "@/components/ui/controls/board-layout-toggle";
import ContentFilter from "@/components/ui/controls/content-filter";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import ViewModeToggle from "@/components/ui/layout/view-mode-toggle";
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
  onMemoToggle?: (show: boolean) => void;
  onTaskToggle?: (show: boolean) => void;
  // Right panel mode for tooltip context
  contentFilterRightPanelMode?: "memo-list" | "task-list" | "editor" | null;
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
  marginBottom = "mb-3",
  headerMarginBottom = "mb-1.5",
  boardLayout = "horizontal",
  isReversed = false,
  onBoardLayoutChange,
  showMemo = true,
  showTask = true,
  onMemoToggle,
  onTaskToggle,
  contentFilterRightPanelMode,
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

  const [shouldShowSettingsIcon, setShouldShowSettingsIcon] = useState(
    rightPanelMode === "hidden",
  );

  // コントロールパネルの位置管理（左・中央・右の3択）
  const [controlPosition, setControlPosition] = useState<
    "left" | "center" | "right"
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("team-float-control-position");
      if (
        saved &&
        (saved === "left" || saved === "center" || saved === "right")
      ) {
        return saved;
      }
    }
    return "right"; // デフォルト位置（右）
  });

  const controlRef = useRef<HTMLDivElement>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0,
  );

  // 初回レンダリング後にアニメーションを有効化
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialRender(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // リサイズ対応：ウィンドウ幅を監視
  useEffect(() => {
    if (typeof window === "undefined" || !floatControls) return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [floatControls]);

  // 位置から座標を計算（useMemoでメモ化）
  const pixelPosition = useMemo(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };

    // ヘッダー内に配置（h-16 = 64px、コントロールパネル h-7 = 28px）
    const headerHeight = 64;
    const controlHeight = 28;
    const y = (headerHeight - controlHeight) / 2; // 垂直中央配置
    const controlWidth = controlRef.current?.offsetWidth || 0;
    let x = 0;

    switch (controlPosition) {
      case "left":
        // ロゴ（14px padding + 40px + 16px gap + タイトル等）の後ろから
        x = 200; // 左側の要素を避けた位置
        break;
      case "center":
        x = windowWidth / 2 - controlWidth / 2;
        break;
      case "right":
        // 通知ベル（約40px）+ gap（8px）+ UserButton（32px）+ padding（32px）= 約112px
        x = windowWidth - controlWidth - 105; // 右側の要素を避けた位置
        break;
    }

    return { x, y };
  }, [controlPosition, windowWidth]);

  // 位置切り替え（左→中央→右→左...）
  const togglePosition = () => {
    if (!floatControls) return;

    const nextPosition =
      controlPosition === "left"
        ? "center"
        : controlPosition === "center"
          ? "right"
          : "left";

    setControlPosition(nextPosition);
    localStorage.setItem("team-float-control-position", nextPosition);
  };

  // 右パネルの状態変化に応じて設定アイコンの表示を制御
  useEffect(() => {
    if (rightPanelMode === "hidden") {
      // パネルが閉じる時はアニメーション完了後に表示（300ms待機）
      const timer = setTimeout(() => {
        setShouldShowSettingsIcon(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // パネルが開く時は即座に隠す
      setShouldShowSettingsIcon(false);
    }
  }, [rightPanelMode]);

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
        <span>{tab.label}</span>
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
          <h1 className="font-bold text-gray-800 text-[22px] w-[105px] truncate">
            {currentMode === "memo"
              ? "メモ一覧"
              : currentMode === "task"
                ? "タスク一覧"
                : "ボード一覧"}
          </h1>
        )}

        {/* 新規追加ボタン（個人モードはヘッダー部分に表示） */}
        {!customTitle && !hideAddButton && !teamMode && (
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

        {/* タブ（boardモード以外） */}
        {currentMode !== "board" && (
          <div className={`flex items-center gap-2 ${!teamMode ? "ml-2" : ""}`}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const tabClass = tab.icon
                ? "pl-2 pr-2 py-2"
                : "gap-1.5 px-2 py-1.5";

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
                  className={`flex items-center ${tabClass} rounded-lg font-medium transition-colors text-gray-600 text-[13px] ${getTabBackgroundClass(tab.id, isActive)}`}
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
  const controlsContent = !(
    (currentMode === "memo" && preferences?.memoHideControls) ||
    (currentMode === "task" && preferences?.taskHideControls)
  ) ? (
    <div
      ref={floatControls ? controlRef : null}
      className={`flex items-center gap-2 h-7 ${floatControls ? `fixed z-20 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg ${!isInitialRender ? "transition-all duration-300" : ""}` : teamMode ? "mb-1.5" : ""}`}
      style={
        floatControls
          ? {
              left: `${pixelPosition.x}px`,
              top: `${pixelPosition.y}px`,
            }
          : undefined
      }
    >
      {/* 位置切り替えハンドル */}
      {floatControls && (
        <button
          onClick={togglePosition}
          className="flex items-center mr-1 opacity-40 hover:opacity-70 transition-opacity cursor-pointer"
        >
          <div className="flex items-center gap-0.5">
            <div
              className={`${controlPosition === "left" ? "w-1.5 h-1.5 bg-gray-800" : "w-1 h-1 bg-gray-500"} rounded-full transition-all`}
            ></div>
            <div
              className={`${controlPosition === "center" ? "w-1.5 h-1.5 bg-gray-800" : "w-1 h-1 bg-gray-500"} rounded-full transition-all`}
            ></div>
            <div
              className={`${controlPosition === "right" ? "w-1.5 h-1.5 bg-gray-800" : "w-1 h-1 bg-gray-500"} rounded-full transition-all`}
            ></div>
          </div>
        </button>
      )}
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
          iconSize="size-4"
        />
      )}

      {/* 設定ボタン（ボードモードのみコントロールパネルに表示） */}
      {currentMode === "board" &&
        boardId &&
        onBoardSettings &&
        shouldShowSettingsIcon && (
          <Tooltip text="ボード設定" position="bottom-left">
            <button
              onClick={onBoardSettings}
              className="p-1 text-gray-600 h-7 flex items-center"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

      {/* ボードレイアウト切り替え（boardモードのみ） */}
      {currentMode === "board" && onBoardLayoutChange && (
        <BoardLayoutToggle
          boardLayout={boardLayout}
          isReversed={isReversed}
          onBoardLayoutChange={onBoardLayoutChange}
          buttonSize="size-7"
          iconSize="size-8"
        />
      )}

      {/* コンテンツフィルター（boardモードのみ） */}
      {currentMode === "board" && onMemoToggle && onTaskToggle && (
        <ContentFilter
          showMemo={showMemo}
          showTask={showTask}
          onMemoToggle={onMemoToggle}
          onTaskToggle={onTaskToggle}
          rightPanelMode={contentFilterRightPanelMode}
        />
      )}

      {/* 全選択/全解除ボタン（チェックモードのみ、メモ・タスク画面のみ、対象アイテムがある場合のみ） */}
      {(currentMode === "memo" || currentMode === "task") &&
        selectionMode === "check" &&
        onSelectAll &&
        (() => {
          // 対象アイテム数の確認
          let hasTargetItems = false;
          if (currentMode === "memo") {
            hasTargetItems =
              activeTab === "deleted" ? deletedMemosCount > 0 : normalCount > 0;
          } else if (currentMode === "task") {
            if (activeTab === "deleted") {
              hasTargetItems = deletedTasksCount > 0;
            } else {
              const statusCount =
                activeTab === "todo"
                  ? todoCount
                  : activeTab === "in_progress"
                    ? inProgressCount
                    : activeTab === "completed"
                      ? completedCount
                      : 0;
              hasTargetItems = statusCount > 0;
            }
          }

          return hasTargetItems ? (
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
          ) : null;
        })()}

      {/* 並び替えメニュー */}
      {onSortChange && sortOptions.length > 0 && (
        <SortToggle
          sortOptions={sortOptions}
          onSortChange={onSortChange}
          buttonSize="size-6"
          iconSize="size-4"
        />
      )}

      {/* ボード名表示切り替え（メモ・タスク） */}
      {(currentMode === "memo" || currentMode === "task") &&
        onShowBoardNameChange && (
          <BoardNameToggle
            showBoardName={showBoardName}
            onToggle={onShowBoardNameChange}
            buttonSize="size-7"
            iconSize="size-4"
            boards={boards}
            selectedBoardIds={selectedBoardIds}
            onBoardFilterChange={onBoardFilterChange}
            filterMode={filterMode}
            onFilterModeChange={onFilterModeChange}
          />
        )}

      {/* タグ表示切り替え（メモ・タスク・ボードモード） */}
      {(currentMode === "memo" ||
        currentMode === "task" ||
        currentMode === "board") &&
        onShowTagDisplayChange && (
          <TagDisplayToggle
            showTags={showTagDisplay}
            onToggle={onShowTagDisplayChange}
            buttonSize="size-7"
            iconSize="size-4"
            tags={tags}
            selectedTagIds={selectedTagIds}
            onTagFilterChange={onTagFilterChange}
            filterMode={tagFilterMode}
            onFilterModeChange={onTagFilterModeChange}
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

      {/* CSVインポートボタン（メモ・タスクモード、またはボードモードでonCsvImportがある場合） */}
      {((!customTitle &&
        !hideAddButton &&
        (currentMode === "memo" || currentMode === "task")) ||
        (currentMode === "board" && customTitle)) &&
        onCsvImport && (
          <Tooltip text="CSVインポート" position="bottom">
            <button
              onClick={onCsvImport}
              className="bg-gray-100 shadow-sm rounded-lg size-7 flex items-center justify-center transition-all text-gray-500 opacity-65 hover:opacity-85"
            >
              <CsvImportIcon className="size-[18px]" />
            </button>
          </Tooltip>
        )}

      {/* エクスポートボタン（boardモードのみ） */}
      {currentMode === "board" && onBoardExport && (
        <Tooltip text="エクスポート" position="bottom">
          <button
            onClick={onBoardExport}
            disabled={isExportDisabled}
            className={`bg-gray-100 shadow-sm rounded-lg size-7 flex items-center justify-center transition-all ${
              isExportDisabled
                ? "text-gray-400 cursor-not-allowed opacity-40"
                : "text-gray-500 opacity-65 hover:opacity-85"
            }`}
          >
            <CsvExportIcon className="size-[18px]" />
          </button>
        </Tooltip>
      )}
    </div>
  ) : null;

  return (
    <div className={marginBottom}>
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
