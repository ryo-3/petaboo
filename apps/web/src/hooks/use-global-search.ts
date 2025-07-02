import { useMemo, useState, useEffect } from 'react';
import { useNotes, useDeletedNotes } from './use-notes';
import { useTasks, useDeletedTasks } from './use-tasks';
import type { Memo, DeletedMemo } from '@/src/types/memo';
import type { Task, DeletedTask } from '@/src/types/task';

type SearchScope = 'all' | 'title' | 'content';
type SearchType = 'all' | 'memo' | 'task' | 'deleted';

interface SearchResult {
  type: 'memo' | 'task' | 'deleted-memo' | 'deleted-task';
  item: Memo | Task | DeletedMemo | DeletedTask;
  matchedField: 'title' | 'content';
  snippet: string;
}

interface UseGlobalSearchOptions {
  query: string;
  searchScope: SearchScope;
  searchType: SearchType;
  debounceMs?: number;
}

export function useGlobalSearch({
  query,
  searchScope,
  searchType,
  debounceMs = 300
}: UseGlobalSearchOptions) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isSearching, setIsSearching] = useState(false);

  // データ取得
  const { data: memos } = useNotes();
  const { data: deletedMemos } = useDeletedNotes();
  const { data: tasks } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, debounceMs);

    if (query !== debouncedQuery) {
      setIsSearching(true);
    }

    return () => clearTimeout(timer);
  }, [query, debounceMs, debouncedQuery]);

  // 検索結果計算
  const searchResults = useMemo((): SearchResult[] => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    const results: SearchResult[] = [];
    const searchTerm = debouncedQuery.toLowerCase();

    // 検索関数
    const searchInText = (text: string): boolean => {
      return text.toLowerCase().includes(searchTerm);
    };

    const createSnippet = (text: string, matchTerm: string): string => {
      const lowerText = text.toLowerCase();
      const index = lowerText.indexOf(matchTerm);
      if (index === -1) return text.substring(0, 100) + '...';
      
      const start = Math.max(0, index - 30);
      const end = Math.min(text.length, index + matchTerm.length + 30);
      return (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
    };

    // メモ検索（削除済みでない場合のみ）
    if (searchType === 'all' || searchType === 'memo') {
      // 通常メモ
      memos?.forEach((memo: Memo) => {
        let matched = false;
        let matchedField: 'title' | 'content' = 'title';
        let snippet = '';

        if ((searchScope === 'all' || searchScope === 'title') && searchInText(memo.title)) {
          matched = true;
          matchedField = 'title';
          snippet = createSnippet(memo.title, searchTerm);
        } else if ((searchScope === 'all' || searchScope === 'content') && memo.content && searchInText(memo.content)) {
          matched = true;
          matchedField = 'content';
          snippet = createSnippet(memo.content, searchTerm);
        }

        if (matched) {
          results.push({
            type: 'memo',
            item: memo,
            matchedField,
            snippet
          });
        }
      });
    }

    // 削除済みメモ検索（削除済み検索時のみ）
    if (searchType === 'deleted') {
      deletedMemos?.forEach((memo: DeletedMemo) => {
        let matched = false;
        let matchedField: 'title' | 'content' = 'title';
        let snippet = '';

        if ((searchScope === 'all' || searchScope === 'title') && searchInText(memo.title)) {
          matched = true;
          matchedField = 'title';
          snippet = createSnippet(memo.title, searchTerm);
        } else if ((searchScope === 'all' || searchScope === 'content') && memo.content && searchInText(memo.content)) {
          matched = true;
          matchedField = 'content';
          snippet = createSnippet(memo.content, searchTerm);
        }

        if (matched) {
          results.push({
            type: 'deleted-memo',
            item: memo,
            matchedField,
            snippet
          });
        }
      });
    }

    // タスク検索（削除済みでない場合のみ）
    if (searchType === 'all' || searchType === 'task') {
      // 通常タスク
      tasks?.forEach((task) => {
        let matched = false;
        let matchedField: 'title' | 'content' = 'title';
        let snippet = '';

        if ((searchScope === 'all' || searchScope === 'title') && searchInText(task.title)) {
          matched = true;
          matchedField = 'title';
          snippet = createSnippet(task.title, searchTerm);
        } else if ((searchScope === 'all' || searchScope === 'content') && task.description && searchInText(task.description)) {
          matched = true;
          matchedField = 'content';
          snippet = createSnippet(task.description, searchTerm);
        }

        if (matched) {
          results.push({
            type: 'task',
            item: task,
            matchedField,
            snippet
          });
        }
      });
    }

    // 削除済みタスク検索（削除済み検索時のみ）
    if (searchType === 'deleted') {
      deletedTasks?.forEach((task) => {
        let matched = false;
        let matchedField: 'title' | 'content' = 'title';
        let snippet = '';

        if ((searchScope === 'all' || searchScope === 'title') && searchInText(task.title)) {
          matched = true;
          matchedField = 'title';
          snippet = createSnippet(task.title, searchTerm);
        } else if ((searchScope === 'all' || searchScope === 'content') && task.description && searchInText(task.description)) {
          matched = true;
          matchedField = 'content';
          snippet = createSnippet(task.description, searchTerm);
        }

        if (matched) {
          results.push({
            type: 'deleted-task',
            item: task,
            matchedField,
            snippet
          });
        }
      });
    }

    // 関連度順にソート（タイトルマッチを優先）
    return results.sort((a, b) => {
      if (a.matchedField === 'title' && b.matchedField === 'content') return -1;
      if (a.matchedField === 'content' && b.matchedField === 'title') return 1;
      
      // 作成日時順（新しい順）
      const aTime = a.item.createdAt;
      const bTime = b.item.createdAt;
      return bTime - aTime;
    });
  }, [debouncedQuery, searchScope, searchType, memos, deletedMemos, tasks, deletedTasks]);

  return {
    results: searchResults,
    isSearching,
    hasQuery: debouncedQuery.trim().length > 0
  };
}