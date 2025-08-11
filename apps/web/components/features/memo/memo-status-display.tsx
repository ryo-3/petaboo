'use client';

import MemoCard from '@/components/features/memo/memo-card';
import MemoListItem from '@/components/features/memo/memo-list-item';
import ItemStatusDisplay from '@/components/ui/layout/item-status-display';
import type { Memo, DeletedMemo } from '@/src/types/memo';
import type { Tag, Tagging } from '@/src/types/tag';
import type { Board } from '@/src/types/board';
import { useMemo } from 'react';

interface MemoStatusDisplayProps {
  memos: Memo[] | undefined;
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  selectionMode?: 'select' | 'check';
  checkedMemos?: Set<number>;
  onToggleCheck?: (memoId: number) => void;
  onSelectMemo?: (memo: Memo) => void;
  selectedMemoId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: 'include' | 'exclude';
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
  showTags?: boolean;
  
  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allBoards?: Board[];
  allTaggings?: Tagging[];
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: 'memo' | 'task';
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

interface DeletedMemoDisplayProps {
  deletedMemos: DeletedMemo[] | undefined;
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  selectionMode?: 'select' | 'check';
  checkedMemos?: Set<number>;
  onToggleCheck?: (memoId: number) => void;
  onSelectMemo?: (memo: DeletedMemo) => void;
  selectedMemoId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: 'include' | 'exclude';
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
  
  // 全データ事前取得（ちらつき解消）
  allTags?: Tag[];
  allBoards?: Board[];
  allTaggings?: Tagging[];
  allBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: 'memo' | 'task';
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

function MemoStatusDisplay({
  memos,
  viewMode,
  effectiveColumnCount,
  selectionMode = 'select',
  checkedMemos,
  onToggleCheck,
  onSelectMemo,
  selectedMemoId,
  showEditDate = false,
  showBoardName = false,
  selectedBoardIds = [],
  boardFilterMode = 'include',
  sortOptions = [],
  isBoard = false,
  showTags = false,
  allTags,
  allBoards,
  allTaggings,
  allBoardItems,
}: MemoStatusDisplayProps) {
  // フィルタリング済みのメモを取得
  const filteredMemos = useMemo(() => {
    const baseMemos = memos || [];
    
    // ボードフィルタリングが設定されていない場合は全てのメモを返す
    if (!selectedBoardIds || selectedBoardIds.length === 0) {
      return baseMemos;
    }

    // ボードフィルタリングが設定されている場合
    if (!allBoardItems) {
      // データが読み込まれていない場合は全てのメモを表示（ちらつき防止）
      return baseMemos;
    }

    return baseMemos.filter(memo => {
      if (!memo || memo.id === undefined) return false;
      
      const originalId = memo.originalId || memo.id.toString();
      
      // メモが所属するボードのID一覧を取得
      const memoBoardItems = allBoardItems.filter(
        item => item.itemType === 'memo' && item.originalId === originalId
      );
      const memoBoardIds = memoBoardItems.map(item => item.boardId);

      // フィルターモードに応じて表示判定
      if (boardFilterMode === 'exclude') {
        // 除外モード：選択されたボードのいずれにも所属していない場合に表示
        return !selectedBoardIds.some(selectedId => memoBoardIds.includes(selectedId));
      } else {
        // 含むモード（デフォルト）：選択されたボードのいずれかに所属している場合に表示
        return selectedBoardIds.some(selectedId => memoBoardIds.includes(selectedId));
      }
    });
  }, [memos, selectedBoardIds, boardFilterMode, allBoardItems]);


  // 各メモのタグ・ボード情報を事前計算（ちらつき解消）
  const memoDataMap = useMemo(() => {
    if (!filteredMemos || !allTaggings || !allBoardItems || !allTags || !allBoards) {
      return new Map();
    }

    const map = new Map();
    filteredMemos.forEach(memo => {
      if (!memo || memo.id === undefined) return;
      const originalId = memo.originalId || memo.id.toString();
      
      // メモのタグを抽出
      const memoTaggings = allTaggings.filter(
        t => t.targetType === 'memo' && t.targetOriginalId === originalId
      );
      const memoTags = memoTaggings
        .map(t => allTags.find(tag => tag.id === t.tagId))
        .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

      // メモのボードを抽出（重複除去）
      const memoBoardItems = allBoardItems.filter(
        item => item.itemType === 'memo' && item.originalId === originalId
      );
      const uniqueBoardIds = new Set(memoBoardItems.map(item => item.boardId));
      const memoBoards = Array.from(uniqueBoardIds)
        .map(boardId => allBoards.find(board => board.id === boardId))
        .filter((board): board is NonNullable<typeof board> => board !== undefined);


      map.set(memo.id, { tags: memoTags, boards: memoBoards });
    });

    return map;
  }, [filteredMemos, allTaggings, allBoardItems, allTags, allBoards]);

  const getSortValue = (memo: Memo, sortId: string): number => {
    switch (sortId) {
      case "createdAt":
        return memo.createdAt;
      case "updatedAt":
        return memo.updatedAt || memo.createdAt;
      default:
        return 0;
    }
  };

  const getDefaultSortValue = (memo: Memo): number => {
    // デフォルトは更新日順（新しい順）
    return memo.updatedAt || memo.createdAt;
  };

  const renderMemo = (memo: Memo, props: {
    isChecked: boolean;
    onToggleCheck: () => void;
    onSelect: () => void;
    isSelected: boolean;
    showEditDate: boolean;
    showBoardName?: boolean;
    showTags?: boolean;
    variant?: 'normal' | 'deleted';
  }) => {
    const Component = viewMode === 'card' ? MemoCard : MemoListItem;
    const memoData = memoDataMap.get(memo.id) || { tags: [], boards: [] };
    
    /* eslint-disable react/prop-types */
    const memoComponent = (
      <Component
        key={memo.id}
        memo={memo}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        isSelected={props.isSelected}
        showEditDate={props.showEditDate}
        showBoardName={props.showBoardName}
        variant={props.variant}
        selectionMode={selectionMode}
        showTags={props.showTags}
        // 全データ事前取得（ちらつき解消）
        preloadedTags={memoData.tags}
        preloadedBoards={memoData.boards}
      />
    );
    
    return memoComponent;
    /* eslint-enable react/prop-types */
  };

  // フィルター適用時は個別コンポーネントで判定するため、空メッセージは表示しない

  return (
    <ItemStatusDisplay
      items={filteredMemos}
      viewMode={viewMode}
      effectiveColumnCount={effectiveColumnCount}
      selectionMode={selectionMode}
      checkedItems={checkedMemos}
      isBoard={isBoard}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectMemo}
      selectedItemId={selectedMemoId}
      showEditDate={showEditDate}
      showBoardName={showBoardName}
      showTags={showTags}
      sortOptions={sortOptions}
      emptyMessage="メモがありません"
      renderItem={renderMemo}
      getSortValue={getSortValue}
      getDefaultSortValue={getDefaultSortValue}
    />
  );
}

/**
 * 削除済みメモ表示コンポーネント
 */
export function DeletedMemoDisplay({
  deletedMemos,
  viewMode,
  effectiveColumnCount,
  selectionMode = 'select',
  checkedMemos,
  onToggleCheck,
  onSelectMemo,
  selectedMemoId,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  sortOptions = [],
  isBoard = false,
  allTags = [],
  allBoards = [],
  allTaggings = [],
  allBoardItems = []
}: DeletedMemoDisplayProps) {
  const getSortValue = (memo: DeletedMemo, sortId: string): number => {
    switch (sortId) {
      case "createdAt":
        return memo.createdAt;
      case "updatedAt":
        return memo.updatedAt || memo.createdAt;
      case "deletedAt":
        return memo.deletedAt;
      default:
        return 0;
    }
  };

  const getDefaultSortValue = (memo: DeletedMemo): number => {
    // デフォルトは削除日順（新しい順）
    return memo.deletedAt;
  };

  const renderMemo = (memo: DeletedMemo, props: {
    isChecked: boolean;
    onToggleCheck: () => void;
    onSelect: () => void;
    isSelected: boolean;
    showEditDate: boolean;
    showBoardName?: boolean;
    showTags?: boolean;
    variant?: 'normal' | 'deleted';
  }) => {
    // 削除済みメモのタグ・ボード情報を取得
    // 削除済みメモの場合、originalIdは削除前の元のメモIDを文字列化したもの
    const originalId = memo.originalId || memo.id.toString();
    
    // このメモのタグを抽出
    const memoTaggings = allTaggings.filter(
      t => t.targetType === 'memo' && t.targetOriginalId === originalId
    );
    const memoTags = memoTaggings
      .map(t => allTags.find(tag => tag.id === t.tagId))
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

    // このメモのボードを抽出（重複除去）
    const memoBoardItems = allBoardItems.filter(
      item => item.itemType === 'memo' && item.originalId === originalId
    );
    const uniqueBoardIds = new Set(memoBoardItems.map(item => item.boardId));
    const memoBoards = Array.from(uniqueBoardIds)
      .map(boardId => allBoards.find(board => board.id === boardId))
      .filter((board): board is NonNullable<typeof board> => board !== undefined);

    // 削除済みメモのボード表示調査ログ
    if (deletedMemos && deletedMemos.indexOf(memo) === 0) {
      
      // originalIdマッチング詳細調査
      
      const nearbyIds = allBoardItems
        .filter(item => item.itemType === 'memo')
        .map(item => item.originalId)
        .filter(id => Math.abs(parseInt(id) - parseInt(originalId)) <= 20);
      
      if (memoBoardItems.length === 0) {
      }
    }

    const Component = viewMode === 'card' ? MemoCard : MemoListItem;
    /* eslint-disable react/prop-types */
    return (
      <Component
        key={memo.id}
        memo={memo}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        variant="deleted"
        isSelected={props.isSelected}
        showEditDate={props.showEditDate}
        showBoardName={props.showBoardName}
        showTags={props.showTags}
        preloadedTags={memoTags}
        preloadedBoards={memoBoards}
        selectionMode={selectionMode}
      />
    );
    /* eslint-enable react/prop-types */
  };

  return (
    <ItemStatusDisplay
      items={deletedMemos}
      viewMode={viewMode}
      effectiveColumnCount={effectiveColumnCount}
      selectionMode={selectionMode}
      checkedItems={checkedMemos}
      isBoard={isBoard}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectMemo}
      selectedItemId={selectedMemoId}
      showEditDate={showEditDate}
      showBoardName={showBoardName}
      showTags={showTags}
      sortOptions={sortOptions}
      emptyMessage="削除済みメモはありません"
      renderItem={renderMemo}
      getSortValue={getSortValue}
      getDefaultSortValue={getDefaultSortValue}
      variant="deleted"
    />
  );
}

export default MemoStatusDisplay;