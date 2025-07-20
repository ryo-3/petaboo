'use client';

import MemoStatusDisplay from "@/components/features/memo/memo-status-display";
import ListViewIcon from "@/components/icons/list-view-icon";
import TrashIcon from "@/components/icons/trash-icon";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import SortToggle from "@/components/ui/buttons/sort-toggle";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { useSortOptions } from "@/hooks/use-sort-options";

interface BoardMemoSectionProps {
  rightPanelMode: "editor" | "memo-list" | "task-list" | null;
  showMemo: boolean;
  allMemoItems: BoardItemWithContent[];
  memoItems: BoardItemWithContent[];
  activeMemoTab: "normal" | "deleted";
  normalMemoCount: number;
  deletedMemoCount: number;
  showTabText: boolean;
  isLoading: boolean;
  effectiveColumnCount: number;
  viewMode: "card" | "list";
  showEditDate: boolean;
  selectedMemo?: Memo | null;
  onCreateNewMemo: () => void;
  onSetRightPanelMode: (mode: "memo-list") => void;
  onMemoTabChange: (tab: "normal" | "deleted") => void;
  onSelectMemo: (memo: Memo) => void;
}

export default function BoardMemoSection({
  rightPanelMode,
  showMemo,
  allMemoItems,
  memoItems,
  activeMemoTab,
  normalMemoCount,
  deletedMemoCount,
  showTabText,
  isLoading,
  effectiveColumnCount,
  viewMode,
  showEditDate,
  selectedMemo,
  onCreateNewMemo,
  onSetRightPanelMode,
  onMemoTabChange,
  onSelectMemo,
}: BoardMemoSectionProps) {
  // ソートオプションの管理
  const { setSortOptions, getVisibleSortOptions } = useSortOptions("memo");

  if (rightPanelMode === "task-list" || !showMemo) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-1">
            メモ
          </h2>
          <span className="font-normal text-gray-500">
            {allMemoItems.length}
          </span>
          <Tooltip text="新規追加" position="top">
            <AddItemButton
              itemType="memo"
              onClick={onCreateNewMemo}
              size="small"
              showTooltip={false}
              customSize={{
                padding: "p-1",
                iconSize: "size-5",
              }}
              className="size-6 flex items-center justify-center"
            />
          </Tooltip>
          <Tooltip text="メモ一覧表示" position="top">
            <button
              onClick={() => onSetRightPanelMode("memo-list")}
              className="size-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ListViewIcon className="size-5 text-Green" />
            </button>
          </Tooltip>
          
          {/* ソートトグル */}
          <SortToggle
            sortOptions={getVisibleSortOptions(activeMemoTab)}
            onSortChange={setSortOptions}
            buttonSize="size-6"
            iconSize="size-4"
          />
        </div>
      </div>

      {/* メモステータスタブ */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <button
          onClick={() => onMemoTabChange("normal")}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
            activeMemoTab === "normal"
              ? "bg-gray-200"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
          {showTabText && <span>通常</span>}
          <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
            {normalMemoCount}
          </span>
        </button>
        <button
          onClick={() => onMemoTabChange("deleted")}
          className={`flex items-center px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
            activeMemoTab === "deleted"
              ? "bg-red-100"
              : "bg-gray-100 hover:bg-red-100"
          }`}
        >
          <TrashIcon className="w-4 h-4" />
          <span
            className={`text-xs transition-all overflow-hidden text-right ${
              activeMemoTab === "deleted"
                ? "opacity-100 w-9 translate-x-0 px-2 ml-1"
                : "opacity-0 w-0 translate-x-2 px-0"
            }`}
          >
            {deletedMemoCount}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-10 mb-2">
        {(() => {
          console.log('📝 BoardMemoSection状態:', { isLoading, memoItemsLength: memoItems.length, allMemoItemsLength: allMemoItems.length });
          return null;
        })()}
        {isLoading || (allMemoItems.length === 0 && memoItems.length === 0) ? (
          <div className="text-gray-500 text-center py-8">
            メモを読み込み中...
          </div>
        ) : memoItems.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {activeMemoTab === "deleted"
              ? "削除済みメモがありません"
              : "メモがありません"}
          </div>
        ) : (
          <MemoStatusDisplay
            memos={memoItems.map(item => item.content as Memo)}
            viewMode={viewMode}
            effectiveColumnCount={effectiveColumnCount}
            selectionMode="select"
            onSelectMemo={onSelectMemo}
            selectedMemoId={selectedMemo?.id}
            showEditDate={showEditDate}
            sortOptions={getVisibleSortOptions(activeMemoTab).filter(
              opt => opt.id === "createdAt" || opt.id === "updatedAt" || opt.id === "deletedAt"
            ) as Array<{
              id: "createdAt" | "updatedAt" | "deletedAt";
              label: string;
              enabled: boolean;
              direction: "asc" | "desc";
            }>}
          />
        )}
      </div>
    </div>
  );
}