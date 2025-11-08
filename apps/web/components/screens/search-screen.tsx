"use client";

import { useState, useRef } from "react";
import { useGlobalSearch } from "@/src/hooks/use-global-search";
import SearchIcon from "@/components/icons/search-icon";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import { useTeamContext } from "@/src/contexts/team-context";

interface SearchResult {
  type: "memo" | "task" | "deleted-memo" | "deleted-task";
  item: Memo | Task | DeletedMemo | DeletedTask;
  matchedField: "title" | "content";
  snippet: string;
}

interface SearchScreenProps {
  onSelectMemo?: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  onSelectDeletedMemo?: (memo: DeletedMemo) => void;
  onSelectDeletedTask?: (task: DeletedTask) => void;
}

function SearchScreen({
  onSelectMemo,
  onSelectTask,
  onSelectDeletedMemo,
  onSelectDeletedTask,
}: SearchScreenProps) {
  const { isTeamMode: teamMode, teamId } = useTeamContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "title" | "content">(
    "all",
  );
  const [searchTypes, setSearchTypes] = useState<
    Set<"memo" | "task" | "deleted">
  >(new Set(["memo", "task"]));
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">(
    "relevance",
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // 検索タイプ判定
  const searchType = searchTypes.has("deleted")
    ? "all"
    : searchTypes.has("memo") && searchTypes.has("task")
      ? "all"
      : searchTypes.has("memo")
        ? "memo"
        : searchTypes.has("task")
          ? "task"
          : "all";

  // 検索実行 - 削除済みが含まれる場合は常に"all"で検索
  const { results, isSearching, hasQuery } = useGlobalSearch({
    query: searchQuery,
    searchScope,
    searchType,
    debounceMs: 500, // 詳細検索では少し長めのデバウンス
    teamId: teamMode && teamId ? teamId : undefined,
  });

  // チェックボックス変更ハンドラー
  const handleSearchTypeChange = (
    type: "memo" | "task" | "deleted",
    checked: boolean,
  ) => {
    setSearchTypes((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(type);
      } else {
        newSet.delete(type);
      }
      // 少なくとも1つは選択されている必要がある
      return newSet.size > 0 ? newSet : new Set([type]);
    });
  };

  // 検索タイプによる結果フィルタリング + ソート処理
  const filteredAndSortedResults = [...results]
    .filter((result) => {
      // 選択された検索タイプに応じてフィルタリング
      if (result.type === "memo" && !searchTypes.has("memo")) return false;
      if (result.type === "task" && !searchTypes.has("task")) return false;
      if (
        (result.type === "deleted-memo" || result.type === "deleted-task") &&
        !searchTypes.has("deleted")
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.item.createdAt - a.item.createdAt;
        case "title":
          return a.item.title.localeCompare(b.item.title, "ja");
        case "relevance":
        default:
          // タイトルマッチを優先、その後は日付順
          if (a.matchedField === "title" && b.matchedField === "content")
            return -1;
          if (a.matchedField === "content" && b.matchedField === "title")
            return 1;
          return b.item.createdAt - a.item.createdAt;
      }
    });

  // 検索結果選択ハンドラー
  const handleSelectSearchResult = (result: SearchResult) => {
    switch (result.type) {
      case "memo":
        onSelectMemo?.(result.item as Memo);
        break;
      case "task":
        onSelectTask?.(result.item as Task);
        break;
      case "deleted-memo":
        onSelectDeletedMemo?.(result.item as DeletedMemo);
        break;
      case "deleted-task":
        onSelectDeletedTask?.(result.item as DeletedTask);
        break;
    }
  };

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-white">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-6">
        {/* タイトル */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="font-bold text-gray-900 text-[22px]">詳細検索</h1>
        </div>

        {/* 検索バー */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="メモ・タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-Green focus:border-transparent"
              autoFocus
            />
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* フィルター設定 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索範囲 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索範囲
            </label>
            <select
              value={searchScope}
              onChange={(e) =>
                setSearchScope(e.target.value as "all" | "title" | "content")
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSearchTypeChange("memo", !searchTypes.has("memo"))
                }
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-all ${
                  searchTypes.has("memo")
                    ? "bg-Green border-Green text-white"
                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <MemoIcon className="w-4 h-4" />
                メモ
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSearchTypeChange("task", !searchTypes.has("task"))
                }
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-all ${
                  searchTypes.has("task")
                    ? "bg-Blue border-Blue text-white"
                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <TaskIcon className="w-4 h-4" />
                タスク
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSearchTypeChange("deleted", !searchTypes.has("deleted"))
                }
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-all ${
                  searchTypes.has("deleted")
                    ? "bg-red-100 border-red-300 text-red-800"
                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <TrashIcon className="w-4 h-4" />
                削除済み
              </button>
            </div>
          </div>

          {/* ソート順 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ソート順
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "relevance" | "date" | "title")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-Green"
            >
              <option value="relevance">関連度順</option>
              <option value="date">作成日時順</option>
              <option value="title">タイトル順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 検索結果エリア */}
      <div className="relative">
        {!hasQuery ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-medium mb-2">詳細検索</h2>
              <p className="text-gray-400">
                上の検索バーにキーワードを入力してください
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* 検索結果ヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-3 z-10">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-Green"></div>
                      検索中...
                    </span>
                  ) : (
                    <span>
                      「{searchQuery}」の検索結果:{" "}
                      <strong>{filteredAndSortedResults.length}</strong> 件
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 検索結果リスト */}
            <div className="p-6 pb-20">
              {filteredAndSortedResults.length === 0 && !isSearching ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📭</div>
                  <p>検索結果が見つかりませんでした</p>
                  <p className="text-sm mt-2">
                    別のキーワードで試してみてください
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedResults.map((result) => (
                    <DetailedSearchResultItem
                      key={`${result.type}-${result.item.id}`}
                      result={result}
                      onClick={() => handleSelectSearchResult(result)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DetailedSearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function DetailedSearchResultItem({
  result,
  onClick,
}: DetailedSearchResultItemProps) {
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
      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-Green hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start gap-3">
        {/* タイプバッジ */}
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color} flex-shrink-0`}
        >
          {typeInfo.label}
        </span>

        <div className="flex-1 min-w-0">
          {/* タイトル */}
          <h3
            className={`font-medium text-lg ${isDeleted ? "text-gray-500" : "text-gray-900"} mb-1`}
          >
            {title}
          </h3>

          {/* スニペット */}
          <div className="text-sm text-gray-600 mb-2">
            {result.matchedField === "title" ? (
              <span className="italic text-green-600">タイトルにマッチ</span>
            ) : (
              <div className="line-clamp-2">{result.snippet}</div>
            )}
          </div>

          {/* メタ情報 */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>
              作成日:{" "}
              {new Date(result.item.createdAt * 1000).toLocaleDateString(
                "ja-JP",
              )}
            </span>
            <span>
              マッチ箇所:{" "}
              {result.matchedField === "title" ? "タイトル" : "内容"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default SearchScreen;
