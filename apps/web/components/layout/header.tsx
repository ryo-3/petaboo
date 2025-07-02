"use client";

import { useEffect, useRef, useState } from "react";
import { useGlobalSearch } from "@/src/hooks/use-global-search";
import { useApiConnection } from "@/src/hooks/use-api-connection";
import SearchResults from "@/components/shared/search-results";
import SearchIcon from "@/components/icons/search-icon";
import type { Memo, DeletedMemo } from '@/src/types/memo';
import type { Task, DeletedTask } from '@/src/types/task';

interface SearchResult {
  type: 'memo' | 'task' | 'deleted-memo' | 'deleted-task';
  item: Memo | Task | DeletedMemo | DeletedTask;
  matchedField: 'title' | 'content';
  snippet: string;
}

interface HeaderProps {
  currentMode: "memo" | "task";
  onSelectMemo?: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  onSelectDeletedMemo?: (memo: DeletedMemo) => void;
  onSelectDeletedTask?: (task: DeletedTask) => void;
}

function Header({ 
  currentMode, 
  onSelectMemo, 
  onSelectTask, 
  onSelectDeletedMemo, 
  onSelectDeletedTask 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchScope, setSearchScope] = useState<"all" | "title" | "content">(
    "all"
  );
  const [searchType, setSearchType] = useState<"all" | "memo" | "task" | "deleted">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // API接続状況管理
  const { isOnline, lastConnectionCheck, connectionError, toggleOnlineMode } = useApiConnection();

  // 検索実行
  const { results, isSearching, hasQuery } = useGlobalSearch({
    query: searchQuery,
    searchScope,
    searchType
  });

  // ショートカットキーの監視
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K (Cmd+K on Mac) で検索バーにフォーカス
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape で検索バーからフォーカスを外す
      if (
        event.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        searchInputRef.current?.blur();
        setShowFilters(false);
        setShowResults(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 検索結果表示制御
  useEffect(() => {
    if (hasQuery && searchInputRef.current === document.activeElement) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [hasQuery]);

  // フィルター自動クローズ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // フィルターボタンやフィルターパネル外をクリックした場合
      const target = event.target as Element;
      if (!target.closest('[data-filter-container]')) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // 検索クエリ変更時にフィルターを閉じる
  useEffect(() => {
    if (searchQuery) {
      setShowFilters(false);
    }
  }, [searchQuery]);

  // 検索結果選択ハンドラー
  const handleSelectSearchResult = (result: SearchResult) => {
    switch (result.type) {
      case 'memo':
        onSelectMemo?.(result.item as Memo);
        break;
      case 'task':
        onSelectTask?.(result.item as Task);
        break;
      case 'deleted-memo':
        onSelectDeletedMemo?.(result.item as DeletedMemo);
        break;
      case 'deleted-task':
        onSelectDeletedTask?.(result.item as DeletedTask);
        break;
    }
    
    // 検索をクリア
    setSearchQuery("");
    setShowResults(false);
    searchInputRef.current?.blur();
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white flex items-center pl-[14px] pr-8 z-10">
      <div className="flex items-center gap-5 flex-1">
        <div className="flex items-center gap-4">
          {/* ロゴ */}
          <div className="w-9 h-9 bg-Green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>

          {/* タイトル */}
          <h1 className="text-xl font-semibold text-gray-800">Notes</h1>
        </div>

        {/* 検索エリア */}
        <div className="flex-1 max-w-xs relative">
          <div className="relative">
            {/* 検索バー */}
            <div className="relative" data-filter-container>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="クイック検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => hasQuery && setShowResults(true)}
                onBlur={() => {
                  // 少し遅延してから閉じる（検索結果クリック時のために）
                  setTimeout(() => setShowResults(false), 200);
                }}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-Green focus:border-transparent"
              />
              {/* 検索アイコン */}
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              {/* フィルターボタン */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  showFilters ? "text-Green" : "text-gray-400"
                } hover:text-Green transition-colors`}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                  />
                </svg>
              </button>
            </div>

            {/* フィルターパネル */}
            {showFilters && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20" data-filter-container>
                <div className="grid grid-cols-2 gap-4">
                  {/* 検索範囲 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      検索範囲
                    </label>
                    <select
                      value={searchScope}
                      onChange={(e) =>
                        setSearchScope(
                          e.target.value as "all" | "title" | "content"
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-Green"
                    >
                      <option value="all">タイトル + 内容</option>
                      <option value="title">タイトルのみ</option>
                      <option value="content">内容のみ</option>
                    </select>
                  </div>

                  {/* 検索対象 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      検索対象
                    </label>
                    <select
                      value={searchType}
                      onChange={(e) =>
                        setSearchType(e.target.value as "all" | "memo" | "task" | "deleted")
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-Green"
                    >
                      <option value="all">メモ + タスク</option>
                      <option value="memo">メモのみ</option>
                      <option value="task">タスクのみ</option>
                      <option value="deleted">削除済みのみ</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 検索結果 */}
            {showResults && (
              <SearchResults
                results={results}
                isSearching={isSearching}
                hasQuery={hasQuery}
                onSelectItem={handleSelectSearchResult}
              />
            )}
          </div>
        </div>

        {/* オンライン/オフライン状態表示と切り替え */}
        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">{isOnline ? 'オンライン' : 'オフライン'}</span>
          </div>
          <button
            onClick={toggleOnlineMode}
            className={`p-2 rounded-lg transition-colors ${
              isOnline
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            {isOnline ? (
              // WiFiアイコン
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 20L8.4 16.2C9.8 15.1 11.8 15.1 13.2 16.2L12 20M6.8 14C9.2 12.2 11.8 12.2 14.2 14L15.6 12.4C12.8 10.2 9.2 10.2 6.4 12.4L6.8 14M4.4 11.6C8.4 8.4 13.6 8.4 17.6 11.6L19 10C13.8 6 8.2 6 3 10L4.4 11.6M2 8.2C8.8 3.4 15.2 3.4 22 8.2L20.6 9.8C14.8 5.8 9.2 5.8 3.4 9.8L2 8.2Z"/>
              </svg>
            ) : (
              // WiFi無効アイコン
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.36 18l1.64 1.64L24 17.64 6.36 0 4.72 1.64 8.11 5.03L2 12v2l5.5-1.5L10 16v2l2-1.5 2 1.5v-2l2.5-3.5L18.36 15l2 2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
