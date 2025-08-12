"use client";

import { useState } from "react";
import Tooltip from "@/components/ui/base/tooltip";
import DashboardIcon from "@/components/icons/dashboard-icon";
import FilterIcon from "@/components/icons/filter-icon";
import Modal from "@/components/ui/modals/modal";

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
  const [showFilterModal, setShowFilterModal] = useState(false);

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
    onBoardFilterChange(boards.map(board => board.id));
  };

  const handleClearAll = () => {
    if (!onBoardFilterChange) return;
    onBoardFilterChange([]);
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
        <>
          <Tooltip text="ボード名で絞込" position="bottom">
            <button
              onClick={() => setShowFilterModal(true)}
              className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
                selectedBoardIds.length > 0
                  ? "bg-light-Blue text-white opacity-100"
                  : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
              }`}
            >
              <FilterIcon className={iconSize} />
            </button>
          </Tooltip>

          {/* ボード絞り込みモーダル */}
          <div className="[&_.modal-header]:!py-2 [&_.modal-header]:!border-b-0 [&_.modal-content]:!px-4 [&_.modal-content]:!pb-4 [&_.modal-content]:!pt-0">
            <Modal
              isOpen={showFilterModal}
              onClose={() => setShowFilterModal(false)}
              title="ボード絞り込み"
              maxWidth="xl"
            >
            <div className="space-y-3">

              {/* フィルターモード切り替え */}
              {onFilterModeChange && (
                <div>
                  <div className="flex rounded-md bg-gray-100 p-0.5">
                    <button
                      onClick={() => onFilterModeChange('include')}
                      className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-all flex items-center justify-center gap-1 ${
                        filterMode === 'include'
                          ? 'bg-light-Blue text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <svg className={`w-4 h-4 text-white transition-opacity duration-300 ${
                        filterMode === 'include' ? 'opacity-100' : 'opacity-0'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>含む</span>
                    </button>
                    <button
                      onClick={() => onFilterModeChange('exclude')}
                      className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-all flex items-center justify-center gap-1 ${
                        filterMode === 'exclude'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <svg className={`w-4 h-4 text-white transition-opacity duration-300 ${
                        filterMode === 'exclude' ? 'opacity-100' : 'opacity-0'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>除く</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ボード一覧 */}
              <div>
                <div className="mb-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">ボード一覧</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      全選択
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      全解除
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  {boards.length === 0 ? (
                    <p className="text-sm text-gray-500 p-4 text-center">ボードがありません</p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {boards.map(board => (
                        <label
                          key={board.id}
                          className="flex items-center gap-3 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBoardIds.includes(board.id)}
                            onChange={() => handleBoardToggle(board.id)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
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
                          <span className="text-sm text-gray-700 flex-1">{board.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
          </div>
        </>
      )}
    </div>
  );
}

export default BoardNameToggle;