"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import SelectionModeToggle from "@/components/ui/buttons/selection-mode-toggle";
import BoardLayoutToggle from "@/components/ui/controls/board-layout-toggle";
import ContentFilter from "@/components/ui/controls/content-filter";
import SettingsIcon from "@/components/icons/settings-icon";
import Tooltip from "@/components/ui/base/tooltip";
import SortToggle from "@/components/ui/buttons/sort-toggle";
import TagDisplayToggle from "@/components/ui/buttons/tag-display-toggle";
import CheckSquareIcon from "@/components/icons/check-square-icon";
import SquareIcon from "@/components/icons/square-icon";
import CsvImportIcon from "@/components/icons/csv-import-icon";
import CsvExportIcon from "@/components/icons/csv-export-icon";
import FilterIcon from "@/components/icons/filter-icon";
import TagIcon from "@/components/icons/tag-icon";
import BoardSelectionModal from "@/components/ui/modals/board-selection-modal";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import { UnifiedFilterButton } from "@/components/ui/buttons/unified-filter-button";

interface ControlPanelProps {
  // 基本設定
  currentMode: "memo" | "task" | "board";
  columnCount: number;
  onColumnCountChange: (count: number) => void;
  rightPanelMode: "hidden" | "view" | "create";

  // フロート設定
  floatControls?: boolean;
  hideControls?: boolean;

  // 選択モード
  selectionMode?: "select" | "check";
  onSelectionModeChange?: (mode: "select" | "check") => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;

  // ボード専用
  boardId?: number;
  onBoardSettings?: () => void;
  boardLayout?: "horizontal" | "vertical";
  isReversed?: boolean;
  onBoardLayoutChange?: (layout: "horizontal" | "vertical") => void;
  showMemo?: boolean;
  showTask?: boolean;
  showComment?: boolean;
  onMemoToggle?: (show: boolean) => void;
  onTaskToggle?: (show: boolean) => void;
  onCommentToggle?: (show: boolean) => void;
  contentFilterRightPanelMode?: "memo-list" | "task-list" | "editor" | null;
  // 選択時モード用
  isSelectedMode?: boolean;
  listTooltip?: string;
  detailTooltip?: string;
  selectedItemType?: "memo" | "task" | null;

  // ソート設定
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

  // 表示切り替え
  showTagDisplay?: boolean;
  onShowTagDisplayChange?: (show: boolean) => void;

  // ボードフィルター
  boards?: Array<{ id: number; name: string; isCurrentBoard?: boolean }>;
  selectedBoardIds?: number[];
  onBoardFilterChange?: (boardIds: number[]) => void;
  boardFilterMode?: "include" | "exclude";
  onBoardFilterModeChange?: (mode: "include" | "exclude") => void;

  // タグフィルター
  tags?: Array<{ id: number; name: string; color?: string }>;
  selectedTagIds?: number[];
  onTagFilterChange?: (tagIds: number[]) => void;
  tagFilterMode?: "include" | "exclude";
  onTagFilterModeChange?: (mode: "include" | "exclude") => void;

  // その他
  onCsvImport?: () => void;
  onBoardExport?: () => void;
  isExportDisabled?: boolean;
  teamMode?: boolean;
  teamId?: number;
  activeTab?: string;
  normalCount?: number;
  deletedMemosCount?: number;
  deletedTasksCount?: number;
  deletedCount?: number;
  todoCount?: number;
  inProgressCount?: number;
  completedCount?: number;
  customTitle?: string;
  hideAddButton?: boolean;
}

export default function ControlPanel({
  currentMode,
  columnCount,
  onColumnCountChange,
  rightPanelMode,
  floatControls = false,
  hideControls = false,
  selectionMode = "select",
  onSelectionModeChange,
  onSelectAll,
  isAllSelected = false,
  boardId,
  onBoardSettings,
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
  sortOptions = [],
  onSortChange,
  showTagDisplay = false,
  onShowTagDisplayChange,
  boards,
  selectedBoardIds = [],
  onBoardFilterChange,
  boardFilterMode = "include",
  onBoardFilterModeChange,
  tags,
  selectedTagIds = [],
  onTagFilterChange,
  tagFilterMode = "include",
  onTagFilterModeChange,
  onCsvImport,
  onBoardExport,
  isExportDisabled = false,
  teamMode = false,
  teamId,
  activeTab,
  normalCount = 0,
  deletedMemosCount = 0,
  deletedTasksCount = 0,
  deletedCount = 0,
  todoCount = 0,
  inProgressCount = 0,
  completedCount = 0,
  customTitle,
  hideAddButton = false,
}: ControlPanelProps) {
  const controlRef = useRef<HTMLDivElement>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0,
  );
  const [controlWidth, setControlWidth] = useState(0);
  const [isBoardFilterOpen, setIsBoardFilterOpen] = useState(false);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);

  // コントロールパネルの位置管理
  const [controlPosition, setControlPosition] = useState<
    "left" | "center" | "right"
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("control-panel-position");
      if (
        saved &&
        (saved === "left" || saved === "center" || saved === "right")
      ) {
        return saved;
      }
    }
    return "right";
  });

  // 初回レンダリング後にアニメーションを有効化
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialRender(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // コントロールパネルの幅を確実に取得
  useEffect(() => {
    if (!floatControls || !controlRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setControlWidth(width);
        }
      }
    });

    resizeObserver.observe(controlRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [floatControls]);

  // リサイズ対応
  useEffect(() => {
    if (typeof window === "undefined" || !floatControls) return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [floatControls]);

  // 位置から座標を計算
  const pixelPosition = useMemo(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };

    const headerHeight = 64;
    const controlHeight = 28;
    const y = (headerHeight - controlHeight) / 2;
    let x = 0;

    if (controlWidth === 0) {
      return { x: -9999, y };
    }

    switch (controlPosition) {
      case "left":
        x = 220;
        break;
      case "center":
        x = windowWidth / 2 - controlWidth / 2;
        break;
      case "right":
        x = Math.max(0, windowWidth - controlWidth - 128);
        break;
    }

    return { x, y };
  }, [controlPosition, windowWidth, controlWidth]);

  const boardFilterEnabled =
    !!boards?.length && typeof onBoardFilterChange === "function";
  const tagFilterEnabled =
    !!tags?.length && typeof onTagFilterChange === "function";

  const boardFilterActive =
    boardFilterEnabled && (selectedBoardIds?.length || 0) > 0;
  const tagFilterActive = tagFilterEnabled && (selectedTagIds?.length || 0) > 0;

  const boardFilterTooltip = boardFilterActive
    ? `ボード絞り込み (${boardFilterMode === "exclude" ? "除外" : "含む"}: ${selectedBoardIds?.length})`
    : "ボード絞り込み";
  const tagFilterTooltip = tagFilterActive
    ? `タグ絞り込み (${tagFilterMode === "exclude" ? "除外" : "含む"}: ${selectedTagIds?.length})`
    : "タグ絞り込み";

  // 位置切り替え
  const togglePosition = () => {
    if (!floatControls) return;

    const nextPosition =
      controlPosition === "left"
        ? "center"
        : controlPosition === "center"
          ? "right"
          : "left";

    setControlPosition(nextPosition);
    localStorage.setItem("control-panel-position", nextPosition);
  };

  if (hideControls) return null;

  return (
    <>
      <div
        ref={floatControls ? controlRef : null}
        className={`flex items-center gap-2 h-7 ${floatControls ? `md:fixed z-20 md:bg-white/95 md:backdrop-blur-sm md:px-3 md:py-1.5 md:rounded-lg ${!isInitialRender ? "md:transition-all md:duration-300" : ""} mb-1.5` : "mb-1.5"}`}
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
            className="hidden md:flex items-center mr-1 opacity-40 hover:opacity-70 transition-opacity cursor-pointer"
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

        {/* モバイル用ボード名表示 */}
        {customTitle && (
          <div className="md:hidden flex-shrink-0 mr-2">
            <h2 className="text-sm font-bold text-gray-800 truncate max-w-[120px]">
              {customTitle}
            </h2>
          </div>
        )}

        <div className="hidden md:block">
          <ColumnCountSelector
            columnCount={columnCount}
            onColumnCountChange={onColumnCountChange}
            isRightPanelShown={rightPanelMode !== "hidden"}
            containerHeight="h-7"
            buttonSize="size-6"
          />
        </div>

        {/* 選択モード切り替え */}
        {onSelectionModeChange && (
          <SelectionModeToggle
            mode={selectionMode}
            onModeChange={onSelectionModeChange}
            buttonSize="size-7"
            iconSize="size-4"
          />
        )}

        {/* ボードレイアウト切り替え（boardモードのみ、チームモードでは非表示） */}
        {currentMode === "board" && onBoardLayoutChange && !teamMode && (
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
            showComment={showComment}
            onMemoToggle={onMemoToggle}
            onTaskToggle={onTaskToggle}
            onCommentToggle={onCommentToggle}
            rightPanelMode={contentFilterRightPanelMode}
            isSelectedMode={isSelectedMode}
            listTooltip={listTooltip}
            detailTooltip={detailTooltip}
            selectedItemType={selectedItemType}
          />
        )}

        {/* 全選択/全解除ボタン */}
        {(currentMode === "memo" || currentMode === "task") &&
          selectionMode === "check" &&
          onSelectAll &&
          (() => {
            let hasTargetItems = false;
            if (currentMode === "memo") {
              hasTargetItems =
                activeTab === "deleted"
                  ? deletedMemosCount > 0
                  : normalCount > 0;
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
            return hasTargetItems;
          })() && (
            <Tooltip
              text={isAllSelected ? "全解除" : "全選択"}
              position="bottom"
            >
              <button
                onClick={onSelectAll}
                className="bg-gray-100 rounded-lg size-7 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
              >
                {isAllSelected ? (
                  <CheckSquareIcon className="size-4" />
                ) : (
                  <SquareIcon className="size-4" />
                )}
              </button>
            </Tooltip>
          )}

        {/* ソート設定 */}
        {onSortChange && sortOptions.length > 0 && (
          <SortToggle
            sortOptions={sortOptions}
            onSortChange={onSortChange}
            buttonSize="size-7"
            iconSize="size-4"
          />
        )}

        {/* 統合フィルター（タグ・ボード） */}
        {(boardFilterEnabled || tagFilterEnabled) && (
          <UnifiedFilterButton
            buttonSize="size-7"
            iconSize="w-4 h-4"
            onOpenTagFilter={() => setIsTagFilterOpen(true)}
            onOpenBoardFilter={() => setIsBoardFilterOpen(true)}
          />
        )}

        {/* タグ表示切り替え（ボードモードのみ） */}
        {currentMode === "board" && onShowTagDisplayChange && (
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

        {/* CSVインポート */}
        {((!customTitle &&
          !hideAddButton &&
          (currentMode === "memo" || currentMode === "task")) ||
          (currentMode === "board" && customTitle)) &&
          onCsvImport && (
            <Tooltip text="CSVインポート" position="bottom">
              <button
                onClick={onCsvImport}
                className="hidden md:flex bg-gray-100 shadow-sm rounded-lg size-7 items-center justify-center transition-all text-gray-500 opacity-65 hover:opacity-85"
              >
                <CsvImportIcon className="size-[18px]" />
              </button>
            </Tooltip>
          )}

        {/* エクスポート */}
        {currentMode === "board" && onBoardExport && (
          <Tooltip text="エクスポート" position="bottom">
            <button
              onClick={onBoardExport}
              disabled={isExportDisabled}
              className={`hidden md:flex bg-gray-100 shadow-sm rounded-lg size-7 items-center justify-center transition-all ${
                isExportDisabled
                  ? "text-gray-400 cursor-not-allowed opacity-40"
                  : "text-gray-500 opacity-65 hover:opacity-85"
              }`}
            >
              <CsvExportIcon className="size-[18px]" />
            </button>
          </Tooltip>
        )}

        {/* 設定ボタン（ボードモードのみ、一番右） */}
        {currentMode === "board" && boardId && onBoardSettings && (
          <Tooltip text="ボード設定" position="bottom-left">
            <button
              onClick={onBoardSettings}
              className="p-1 text-gray-600 h-7 flex items-center"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>

      {boardFilterEnabled && (
        <BoardSelectionModal
          isOpen={isBoardFilterOpen}
          onClose={() => setIsBoardFilterOpen(false)}
          boards={boards || []}
          selectedBoardIds={selectedBoardIds || []}
          onSelectionChange={onBoardFilterChange!}
          mode="filter"
          filterMode={boardFilterMode}
          onFilterModeChange={onBoardFilterModeChange}
          topOffset={floatControls ? 72 : 0}
          onSwitchToTagFilter={() => {
            setIsBoardFilterOpen(false);
            setIsTagFilterOpen(true);
          }}
        />
      )}

      {tagFilterEnabled && (
        <TagSelectionModal
          isOpen={isTagFilterOpen}
          onClose={() => setIsTagFilterOpen(false)}
          tags={tags || []}
          selectedTagIds={selectedTagIds || []}
          onSelectionChange={onTagFilterChange!}
          mode="filter"
          filterMode={tagFilterMode}
          onFilterModeChange={onTagFilterModeChange}
          teamMode={teamMode}
          teamId={teamId ?? 0}
          topOffset={floatControls ? 72 : 0}
          onSwitchToBoardFilter={() => {
            setIsTagFilterOpen(false);
            setIsBoardFilterOpen(true);
          }}
        />
      )}
    </>
  );
}
