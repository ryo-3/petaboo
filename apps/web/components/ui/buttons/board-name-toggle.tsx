"use client";

import { useState, useRef, useEffect } from "react";
import Tooltip from "@/components/ui/base/tooltip";
import DashboardIcon from "@/components/icons/dashboard-icon";
import FilterIcon from "@/components/icons/filter-icon";

interface BoardNameToggleProps {
  showBoardName: boolean;
  onToggle: (show: boolean) => void;
  buttonSize?: string;
  iconSize?: string;
  boards?: Array<{ id: number; name: string }>;
  selectedBoardIds?: number[];
  onBoardFilterChange?: (boardIds: number[]) => void;
  // フィルターモード関連
  filterMode?: 'include' | 'exclude';
  onFilterModeChange?: (mode: 'include' | 'exclude') => void;
}

function BoardNameToggle({ 
  showBoardName, 
  onToggle, 
  buttonSize = "size-7", 
  iconSize = "size-4",
  boards = [],
  selectedBoardIds = [],
  onBoardFilterChange,
  filterMode = 'include',
  onFilterModeChange
}: BoardNameToggleProps) {
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // 外側クリック検知
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    };

    if (showFilter) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilter]);

  const handleBoardToggle = (boardId: number) => {
    if (!onBoardFilterChange) return;
    
    if (selectedBoardIds.includes(boardId)) {
      onBoardFilterChange(selectedBoardIds.filter(id => id !== boardId));
    } else {
      onBoardFilterChange([...selectedBoardIds, boardId]);
    }
  };

  const handleSelectAll = () => {
    if (!onBoardFilterChange) return;
    // 全選択状態なら全解除、そうでなければ全選択
    if (selectedBoardIds.length === boards.length) {
      onBoardFilterChange([]);
    } else {
      onBoardFilterChange(boards.map(board => board.id));
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip text={showBoardName ? "ボード名を非表示" : "ボード名を表示"} position="bottom">
        <button
          onClick={() => {
            onToggle(!showBoardName);
          }}
          className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
            showBoardName
              ? "bg-light-Blue text-white opacity-100"
              : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
          }`}
        >
          <DashboardIcon className={iconSize} />
        </button>
      </Tooltip>

      {/* フィルターボタン（ボード名表示時のみ） */}
      {showBoardName && onBoardFilterChange && (
        <div className="relative" ref={filterRef}>
          <Tooltip text="ボード名で絞込" position="bottom">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
                selectedBoardIds.length > 0
                  ? "bg-light-Blue text-white opacity-100"
                  : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
              }`}
            >
              <FilterIcon className={iconSize} />
            </button>
          </Tooltip>

          {/* フィルターポップオーバー */}
          {showFilter && (
            <div className="absolute top-9 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
              {/* フィルターモード切り替え */}
              {onFilterModeChange && (
                <div className="mb-3 pb-2 border-b border-gray-100">
                  <div className="flex rounded-md bg-gray-100 p-0.5">
                    <button
                      onClick={() => onFilterModeChange('include')}
                      className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                        filterMode === 'include'
                          ? 'bg-light-Blue text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      含む
                    </button>
                    <button
                      onClick={() => onFilterModeChange('exclude')}
                      className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                        filterMode === 'exclude'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      除く
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">ボード一覧</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBoardIds.length === boards.length && boards.length > 0}
                    onChange={handleSelectAll}
                    className="sr-only"
                  />
                  <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${
                    selectedBoardIds.length === boards.length && boards.length > 0
                      ? 'bg-light-Blue border-light-Blue'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedBoardIds.length === boards.length && boards.length > 0 && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">
                    {selectedBoardIds.length === boards.length && boards.length > 0 ? "全解除" : "全選択"}
                  </span>
                </label>
              </div>
              <div className="space-y-1">
                {boards.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">ボードがありません</p>
                ) : (
                  boards.map(board => (
                    <label
                      key={board.id}
                      className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBoardIds.includes(board.id)}
                        onChange={() => handleBoardToggle(board.id)}
                        className="sr-only"
                      />
                      <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${
                        selectedBoardIds.includes(board.id)
                          ? 'bg-light-Blue border-light-Blue'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selectedBoardIds.includes(board.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{board.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BoardNameToggle;