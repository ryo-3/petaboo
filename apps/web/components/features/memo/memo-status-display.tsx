'use client';

import MemoCard from '@/components/features/memo/memo-card';
import MemoListItem from '@/components/features/memo/memo-list-item';
import ItemStatusDisplay from '@/components/ui/layout/item-status-display';
import MemoFilterWrapper from '@/components/features/memo/memo-filter-wrapper';
import type { Memo, DeletedMemo } from '@/src/types/memo';
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
  selectedBoardIds?: number[];
  boardFilterMode?: 'include' | 'exclude';
  sortOptions?: Array<{
    id: "createdAt" | "updatedAt" | "deletedAt";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
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
  isBoard = false
}: MemoStatusDisplayProps) {
  // フィルタリング済みのメモを取得（常に全てのメモを返す）
  const filteredMemos = useMemo(() => {
    return memos || [];
  }, [memos]);

  // フィルタリングが必要かどうか
  const needsFiltering = selectedBoardIds && selectedBoardIds.length > 0;

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
    variant?: 'normal' | 'deleted';
  }) => {
    const Component = viewMode === 'card' ? MemoCard : MemoListItem;
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
      />
    );
    
    // フィルタリングが必要な場合はMemoFilterWrapperで包む
    if (needsFiltering) {
      return (
        <MemoFilterWrapper
          key={memo.id}
          memo={memo}
          selectedBoardIds={selectedBoardIds}
          filterMode={boardFilterMode}
        >
          {memoComponent}
        </MemoFilterWrapper>
      );
    }
    
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
  sortOptions = [],
  isBoard = false
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
    variant?: 'normal' | 'deleted';
  }) => {
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