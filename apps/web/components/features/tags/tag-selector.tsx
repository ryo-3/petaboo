"use client";

import React, { useState, useEffect, useRef, useId, useContext, useCallback } from 'react';
import ChevronDownIcon from "@/components/icons/chevron-down-icon";
import PlusIcon from "@/components/icons/plus-icon";
import CheckIcon from "@/components/icons/check-icon";
import { SelectorContext } from "@/src/contexts/selector-context";
import { useTags, useCreateTag } from '@/src/hooks/use-tags';
import type { Tag } from '@/src/types/tag';

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  className?: string;
  placeholder?: string;
  forceOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  renderTrigger?: (onClick?: () => void) => React.ReactNode;
  disabled?: boolean;
}

function TagSelector({
  selectedTags,
  onTagsChange,
  className = "",
  placeholder = "タグを選択...",
  forceOpen = false,
  onOpenChange,
  renderTrigger,
  disabled = false
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [searchText, setSearchText] = useState("");
  const selectorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectorId = useId();
  
  // セレクターコンテキストの安全な使用
  const selectorContext = useContext(SelectorContext);
  const activeSelector = selectorContext?.activeSelector;
  const setActiveSelector = useCallback((id: string | null) => {
    if (selectorContext?.setActiveSelector) {
      selectorContext.setActiveSelector(id);
    }
  }, [selectorContext]);

  // データ取得
  const { data: allTags = [], isLoading: tagsLoading } = useTags({
    search: searchText,
    sort: 'usage',
    limit: 50
  });

  // ミューテーション
  const createTagMutation = useCreateTag();

  // 他のセレクターが開いたら閉じる
  useEffect(() => {
    if (activeSelector && activeSelector !== selectorId) {
      setIsOpen(false);
      setIsCreating(false);
      setNewTagName("");
      setSearchText("");
    }
  }, [activeSelector, selectorId]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewTagName("");
        setSearchText("");
        setActiveSelector(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, setActiveSelector]);

  // 全てのタグを表示（選択済みも含める）
  const availableTags = allTags;

  // タグ選択/選択解除
  const handleToggleTag = (tag: Tag) => {
    if (disabled || !onTagsChange) return;
    
    const isSelected = selectedTags.some(selectedTag => selectedTag.id === tag.id);
    const newTags = isSelected 
      ? selectedTags.filter(t => t.id !== tag.id)
      : [...selectedTags, tag];
    
    onTagsChange(newTags);
  };

  // タグ削除
  const handleRemoveTag = (tag: Tag) => {
    if (disabled || !onTagsChange) return;
    
    const newTags = selectedTags.filter(t => t.id !== tag.id);
    onTagsChange(newTags);
  };

  // 新規タグ作成
  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const newTag = await createTagMutation.mutateAsync({
        name: newTagName.trim()
      });

      const newTags = [...selectedTags, newTag];
      onTagsChange?.(newTags);

      setNewTagName("");
      setIsCreating(false);
    } catch (error) {
      console.error('タグ作成に失敗しました:', error);
    }
  };

  const handleCancelCreate = () => {
    setNewTagName("");
    setIsCreating(false);
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    
    const newOpenState = !isOpen;
    setIsOpen(newOpenState);
    setActiveSelector(newOpenState ? selectorId : null);
    onOpenChange?.(newOpenState);
    
    if (newOpenState && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // forceOpenが変更された時の処理
  useEffect(() => {
    if (forceOpen && !isOpen) {
      setIsOpen(true);
      setActiveSelector(selectorId);
      onOpenChange?.(true);
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [forceOpen, isOpen, selectorId, onOpenChange, setActiveSelector]);

  return (
    <div className={`relative ${className}`} ref={selectorRef}>
      {renderTrigger ? (
        <div>
          {renderTrigger(disabled ? undefined : handleToggleOpen)}
        </div>
      ) : (
        <div
          className={`flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-gray-400 transition-colors min-h-[2rem] ${
            isOpen ? "rounded-b-none border-b-0" : ""
          }`}
          onClick={handleToggleOpen}
        >
        {selectedTags.map((tag) => (
          <div
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{tag.name}</span>
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:bg-blue-200 rounded p-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        
        {selectedTags.length === 0 && (
          <span className="text-gray-500 text-sm">{placeholder}</span>
        )}
        
          <div className="ml-auto">
            <ChevronDownIcon 
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      )}

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto w-72 mt-1">
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="タグを検索..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="py-1">
            {isCreating ? (
              <div className="px-2 py-1">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="新しいタグ名"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateNewTag();
                      } else if (e.key === "Escape") {
                        handleCancelCreate();
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateNewTag}
                    className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    disabled={createTagMutation.isPending}
                  >
                    <CheckIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelCreate}
                    className="px-2 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-50 text-blue-600"
                onClick={() => setIsCreating(true)}
              >
                <span>新しいタグを作成</span>
                <PlusIcon className="w-3 h-3" />
              </button>
            )}

            {tagsLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">読み込み中...</div>
            ) : availableTags.length > 0 ? (
              <div className="border-t border-gray-200 pt-1">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.some(selectedTag => selectedTag.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 ${
                        isSelected ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => handleToggleTag(tag)}
                      disabled={createTagMutation.isPending}
                    >
                      <span className="flex-1">{tag.name}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : searchText ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                「{searchText}」に一致するタグが見つかりません
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                すべてのタグが選択済みです
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TagSelector;