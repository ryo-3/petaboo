"use client";

import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import SelectionModeToggle from "@/components/ui/buttons/selection-mode-toggle";
import ContentFilter from "@/components/ui/controls/content-filter";
import SettingsIcon from "@/components/icons/settings-icon";
import Tooltip from "@/components/ui/base/tooltip";
import SortToggle from "@/components/ui/buttons/sort-toggle";
import CheckSquareIcon from "@/components/icons/check-square-icon";
import SquareIcon from "@/components/icons/square-icon";
import CsvImportIcon from "@/components/icons/csv-import-icon";
import CsvExportIcon from "@/components/icons/csv-export-icon";
import { UnifiedFilterButton } from "@/components/ui/buttons/unified-filter-button";
import UnifiedFilterModal from "@/components/ui/modals/unified-filter-modal";
import { useHeaderControlPanel } from "@/src/contexts/header-control-panel-context";
import { useViewSettings } from "@/src/contexts/view-settings-context";

export default function HeaderControlPanel() {
  const { config } = useHeaderControlPanel();
  const { settings, updateSettings, sessionState, updateSessionState } =
    useViewSettings();

  if (!config || config.hideControls) {
    return null;
  }

  const {
    currentMode,
    rightPanelMode,
    selectionMode = "select",
    onSelectionModeChange,
    onSelectAll,
    isAllSelected = false,
    boardId,
    onBoardSettings,
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
    hideDetailButton = false,
    onCsvImport,
    onBoardExport,
    isExportDisabled = false,
    teamMode = false,
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
  } = config;

  // カラム数をContextから取得
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

  const sortOptions = sessionState.sortOptions;
  const onSortChange = (options: typeof sessionState.sortOptions) =>
    updateSessionState({ sortOptions: options });

  return (
    <>
      <div className="flex items-center gap-2 h-7">
        {/* 選択モード切り替え（列数の左） */}
        {onSelectionModeChange && (
          <SelectionModeToggle
            mode={selectionMode}
            onModeChange={onSelectionModeChange}
            buttonSize="size-7"
            iconSize="size-4"
          />
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

        {/* コンテンツフィルター（boardモード または 選択モード時） */}
        {(currentMode === "board" || isSelectedMode) && onMemoToggle && (
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
            hideDetailButton={hideDetailButton}
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
        <UnifiedFilterButton buttonSize="size-7" iconSize="w-4 h-4" />

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

      {/* 統合フィルターモーダル */}
      <UnifiedFilterModal currentBoardId={boardId} topOffset={0} />
    </>
  );
}
