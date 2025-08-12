"use client";

import { useState } from "react";
import Modal from "@/components/ui/modals/modal";

interface BoardOption {
  id: number;
  name: string;
}

interface BoardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardOption[];
  selectedBoardIds: number[];
  onSelectionChange: (boardIds: number[]) => void;
  mode?: 'selection' | 'filter';
  multiple?: boolean;
  title?: string;
  // フィルターモード関連（filter時のみ使用）
  filterMode?: 'include' | 'exclude';
  onFilterModeChange?: (mode: 'include' | 'exclude') => void;
}

export default function BoardSelectionModal({
  isOpen,
  onClose,
  boards,
  selectedBoardIds,
  onSelectionChange,
  mode = 'selection',
  multiple = true,
  title,
  filterMode = 'include',
  onFilterModeChange
}: BoardSelectionModalProps) {
  const modalTitle = title || (mode === 'filter' ? 'ボード絞り込み' : 'ボード選択');

  const handleBoardToggle = (boardId: number) => {
    if (selectedBoardIds.includes(boardId)) {
      onSelectionChange(selectedBoardIds.filter(id => id !== boardId));
    } else {
      if (multiple) {
        onSelectionChange([...selectedBoardIds, boardId]);
      } else {
        onSelectionChange([boardId]);
        onClose();
      }
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(boards.map(board => board.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="[&_.modal-header]:!border-b-0 [&_.modal-header]:!pb-2">
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        maxWidth="md"
      >
        <div className="space-y-4">
        {/* フィルターモード切り替え（filter時のみ） */}
        {mode === 'filter' && onFilterModeChange && (
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

        {/* 全選択・全解除ボタン（複数選択時のみ） */}
        {multiple && (
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
        )}

        {/* ボード一覧 */}
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
                  <span className="text-sm text-gray-700 flex-1 break-words">{board.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        </div>
      </Modal>
    </div>
  );
}