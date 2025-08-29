"use client";

import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

interface SearchResult {
  type: "memo" | "task" | "deleted-memo" | "deleted-task";
  item: Memo | Task | DeletedMemo | DeletedTask;
  matchedField: "title" | "content";
  snippet: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isSearching: boolean;
  hasQuery: boolean;
  onSelectItem: (result: SearchResult) => void;
  maxResults?: number;
}

function SearchResults({
  results,
  isSearching,
  hasQuery,
  onSelectItem,
  maxResults = 10,
}: SearchResultsProps) {
  if (!hasQuery) {
    return null;
  }

  if (isSearching) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-30">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-Green"></div>
          <span className="ml-2 text-sm text-gray-600">検索中...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-30">
        <div className="text-center py-4 text-sm text-gray-500">
          検索結果が見つかりませんでした
        </div>
      </div>
    );
  }

  const displayResults = results.slice(0, maxResults);
  const hasMore = results.length > maxResults;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
      {displayResults.map((result, index) => (
        <SearchResultItem
          key={`${result.type}-${result.item.id}`}
          result={result}
          onClick={() => onSelectItem(result)}
          isLast={index === displayResults.length - 1 && !hasMore}
        />
      ))}

      {hasMore && (
        <div className="px-4 py-3 border-t border-gray-100 text-center text-sm text-gray-500">
          他に {results.length - maxResults} 件の結果があります
        </div>
      )}
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
  isLast: boolean;
}

function SearchResultItem({ result, onClick, isLast }: SearchResultItemProps) {
  const getTypeInfo = () => {
    switch (result.type) {
      case "memo":
        return { label: "メモ", color: "bg-blue-100 text-blue-800" };
      case "task":
        return { label: "タスク", color: "bg-green-100 text-green-800" };
      case "deleted-memo":
        return { label: "削除済みメモ", color: "bg-gray-100 text-gray-600" };
      case "deleted-task":
        return { label: "削除済みタスク", color: "bg-gray-100 text-gray-600" };
    }
  };

  const typeInfo = getTypeInfo();
  const title = result.item.title;
  const isDeleted = result.type.startsWith("deleted-");

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
        isLast ? "" : "border-b border-gray-100"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* タイプバッジ */}
        <span
          className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${typeInfo.color} flex-shrink-0`}
        >
          {typeInfo.label}
        </span>

        <div className="flex-1 min-w-0">
          {/* タイトル */}
          <div
            className={`font-medium text-sm ${isDeleted ? "text-gray-500" : "text-gray-900"} truncate`}
          >
            {title}
          </div>

          {/* スニペット */}
          <div className="text-xs text-gray-600 mt-1 line-clamp-2">
            {result.matchedField === "title" ? (
              <span className="italic">タイトルにマッチ</span>
            ) : (
              result.snippet
            )}
          </div>

          {/* 作成日 */}
          <div className="text-xs text-gray-400 mt-1">
            {new Date(result.item.createdAt * 1000).toLocaleDateString("ja-JP")}
          </div>
        </div>
      </div>
    </button>
  );
}

export default SearchResults;
