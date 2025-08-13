"use client";

import { useState } from "react";
import Modal from "@/components/ui/modals/modal";
import { TAG_COLORS } from "@/src/constants/colors";

interface TagOption {
  id: number;
  name: string;
  color?: string;
}

interface TagSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagOption[];
  selectedTagIds: number[];
  onSelectionChange: (tagIds: number[]) => void;
  mode?: 'selection' | 'filter';
  multiple?: boolean;
  title?: string;
  // フィルターモード関連（filter時のみ使用）
  filterMode?: 'include' | 'exclude';
  onFilterModeChange?: (mode: 'include' | 'exclude') => void;
}

export default function TagSelectionModal({
  isOpen,
  onClose,
  tags,
  selectedTagIds,
  onSelectionChange,
  mode = 'selection',
  multiple = true,
  title,
  filterMode = 'include',
  onFilterModeChange
}: TagSelectionModalProps) {
  const modalTitle = title || (mode === 'filter' ? 'タグ絞り込み' : 'タグ選択');

  const handleTagToggle = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      if (multiple) {
        onSelectionChange([...selectedTagIds, tagId]);
      } else {
        onSelectionChange([tagId]);
        onClose();
      }
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(tags.map(tag => tag.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="3xl"
      maxHeight="80vh"
      className="[&_.modal-header]:!border-b-0 [&_.modal-header]:!pb-0"
    >
        <div className="h-[70vh] flex flex-col">
        <div className="space-y-4">
        {/* フィルターモード切り替え（filter時のみ） */}
        {mode === 'filter' && onFilterModeChange && (
          <div>
            <div className="flex rounded-md bg-gray-100 p-0.5">
              <button
                onClick={() => onFilterModeChange('include')}
                className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-colors duration-200 flex items-center justify-center gap-1 ${
                  filterMode === 'include'
                    ? 'bg-tag-bg text-tag-text shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className={`w-4 h-4 text-tag-text transition-opacity duration-300 ${
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
            <span className="text-sm font-medium text-gray-700">タグ一覧</span>
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

        {/* タグ一覧 */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
          {tags.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 text-center">タグがありません</p>
          ) : (
            <div className="p-2 space-y-1">
              {tags.map(tag => (
                <label
                  key={tag.id}
                  className="flex items-center gap-3 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => handleTagToggle(tag.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                    selectedTagIds.includes(tag.id)
                      ? 'border-transparent'
                      : 'border-gray-300 bg-white'
                  }`}
                  style={selectedTagIds.includes(tag.id) ? { backgroundColor: TAG_COLORS.background } : {}}
                  >
                    {selectedTagIds.includes(tag.id) && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ color: TAG_COLORS.text }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-700 flex-1 break-words">{tag.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        </div>
        </div>
    </Modal>
  );
}