"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/modals/modal";
import { TAG_COLORS } from "@/src/constants/colors";
import { useCreateTag } from "@/src/hooks/use-tags";
import PlusIcon from "@/components/icons/plus-icon";
import SearchIcon from "@/components/icons/search-icon";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createTagMutation = useCreateTag();

  // 検索でフィルタリング + 選択済みタグを上部に表示
  const filteredTags = useMemo(() => {
    let filtered = tags;
    
    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(query)
      );
    }
    
    // 選択済みタグを上部に、未選択タグを下部に配置
    const selectedTags = filtered.filter(tag => selectedTagIds.includes(tag.id));
    const unselectedTags = filtered.filter(tag => !selectedTagIds.includes(tag.id));
    
    return [...selectedTags, ...unselectedTags];
  }, [tags, searchQuery, selectedTagIds]);

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

  // 新規タグ名のバリデーション
  const isDuplicateTagName = newTagName.trim() !== '' && tags.some(tag => 
    tag.name.toLowerCase() === newTagName.trim().toLowerCase()
  );

  // 新規タグ作成
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    const trimmedName = newTagName.trim();
    
    // 事前バリデーション：重複チェック
    const isDuplicate = tags.some(tag => 
      tag.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
      return; // UIで既に表示済みなのでalertは不要
    }
    
    try {
      setIsCreating(true);
      const newTag = await createTagMutation.mutateAsync({
        name: trimmedName,
        color: TAG_COLORS.background
      });
      
      // 作成したタグを自動選択
      if (multiple) {
        onSelectionChange([...selectedTagIds, newTag.id]);
      } else {
        onSelectionChange([newTag.id]);
      }
      
      setNewTagName("");
      setSearchQuery(""); // 検索もクリア
    } catch (error) {
      console.error('タグ作成エラー:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="3xl"
      maxHeight="80vh"
    >
        <div className="h-[70vh] flex flex-col">
        <div className="space-y-4">
        
        {/* 検索ボックス */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タグを検索..."
            className="w-full px-9 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 新規タグ作成 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCreating) {
                e.preventDefault();
                handleCreateTag();
              }
            }}
            placeholder="新しいタグ名を入力..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || isCreating || isDuplicateTagName}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PlusIcon className="size-4" />
            {isCreating ? '作成中...' : '作成'}
          </button>
        </div>
        {isDuplicateTagName && (
          <div className="mt-2 text-xs text-red-500">
            同じ名前のタグが既に存在します
          </div>
        )}
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
          {filteredTags.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 text-center">
              {searchQuery ? `「${searchQuery}」に一致するタグがありません` : 'タグがありません'}
            </p>
          ) : (
            <div className="p-2 space-y-1">
              {filteredTags.map((tag, index) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const prevTag = filteredTags[index - 1];
                const isPrevSelected = prevTag ? selectedTagIds.includes(prevTag.id) : false;
                const showDivider = index > 0 && isPrevSelected && !isSelected && !searchQuery;
                
                return (
                  <div key={tag.id}>
                    {showDivider && (
                      <div className="my-2 border-t border-gray-200" />
                    )}
                    <label
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
        </div>
    </Modal>
  );
}