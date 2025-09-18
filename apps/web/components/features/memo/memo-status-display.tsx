"use client";

import MemoCard from "@/components/features/memo/memo-card";
import MemoListItem from "@/components/features/memo/memo-list-item";
import ItemStatusDisplay from "@/components/ui/layout/item-status-display";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { useMemo } from "react";

interface MemoStatusDisplayProps {
  memos: Memo[] | undefined;
  viewMode: "card" | "list";
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedMemos?: Set<number>;
  onToggleCheck?: (memoId: number) => void;
  onSelectMemo?: (memo: Memo) => void;
  onDoubleClick?: (memo: Memo) => void;
  selectedMemoId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: "include" | "exclude";
  selectedTagIds?: number[];
  tagFilterMode?: "include" | "exclude";
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
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

interface DeletedMemoDisplayProps {
  deletedMemos: DeletedMemo[] | undefined;
  viewMode: "card" | "list";
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedMemos?: Set<number>;
  onToggleCheck?: (memoId: number) => void;
  onSelectMemo?: (memo: DeletedMemo) => void;
  onDoubleClick?: (memo: DeletedMemo) => void;
  selectedMemoId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  selectedBoardIds?: number[];
  boardFilterMode?: "include" | "exclude";
  selectedTagIds?: number[];
  tagFilterMode?: "include" | "exclude";
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
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
  // 全選択機能
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

function MemoStatusDisplay({
  memos,
  viewMode,
  effectiveColumnCount,
  selectionMode = "select",
  checkedMemos,
  onToggleCheck,
  onSelectMemo,
  onDoubleClick,
  selectedMemoId,
  showEditDate = false,
  showBoardName = false,
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
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
    let baseMemos = memos || [];

    // ボードフィルタリング
    if (selectedBoardIds && selectedBoardIds.length > 0 && allBoardItems) {
      baseMemos = baseMemos.filter((memo) => {
        if (!memo || memo.id === undefined) return false;

        const originalId = memo.originalId || memo.id.toString();

        // メモが所属するボードのID一覧を取得
        const memoBoardItems = allBoardItems.filter(
          (item) => item.itemType === "memo" && item.originalId === originalId,
        );
        const memoBoardIds = memoBoardItems.map((item) => item.boardId);

        // フィルターモードに応じて表示判定
        if (boardFilterMode === "exclude") {
          // 除外モード：選択されたボードのいずれにも所属していない場合に表示
          return !selectedBoardIds.some((selectedId) =>
            memoBoardIds.includes(selectedId),
          );
        } else {
          // 含むモード（デフォルト）：選択されたボードのいずれかに所属している場合に表示
          return selectedBoardIds.some((selectedId) =>
            memoBoardIds.includes(selectedId),
          );
        }
      });
    }

    // タグフィルタリング
    if (selectedTagIds && selectedTagIds.length > 0 && allTaggings) {
      baseMemos = baseMemos.filter((memo) => {
        if (!memo || memo.id === undefined) return false;

        const memoOriginalId = memo.originalId || memo.id.toString();

        // メモに付けられたタグのID一覧を取得
        const memoTagIds = allTaggings
          .filter(
            (tagging) =>
              tagging.targetType === "memo" &&
              tagging.targetOriginalId === memoOriginalId,
          )
          .map((tagging) => tagging.tagId);

        // フィルターモードに応じて表示判定
        if (tagFilterMode === "exclude") {
          // 除外モード：選択されたタグのいずれも付いていない場合に表示
          return !selectedTagIds.some((selectedId) =>
            memoTagIds.includes(selectedId),
          );
        } else {
          // 含むモード（デフォルト）：選択されたタグのいずれかが付いている場合に表示
          return selectedTagIds.some((selectedId) =>
            memoTagIds.includes(selectedId),
          );
        }
      });
    }

    return baseMemos;
  }, [
    memos,
    selectedBoardIds,
    boardFilterMode,
    allBoardItems,
    selectedTagIds,
    tagFilterMode,
    allTaggings,
  ]);

  // 各メモのタグ・ボード情報を事前計算（ちらつき解消）
  const memoDataMap = useMemo(() => {
    // 最小限のデータが揃わない場合は空のMapを返す
    if (!filteredMemos) {
      return new Map();
    }

    // データが不足している場合でも段階的にMapを構築
    const safeAllTaggings = allTaggings || [];
    const safeAllBoardItems = allBoardItems || [];
    const safeAllTags = allTags || [];
    const safeAllBoards = allBoards || [];

    // デバッグ用：入力データ確認
    console.log("🔍 [memoDataMap] 入力データ確認", {
      filteredMemosLength: filteredMemos?.length,
      allTaggingsLength: safeAllTaggings?.length,
      allBoardItemsLength: safeAllBoardItems?.length,
      allTagsLength: safeAllTags?.length,
      allBoardsLength: safeAllBoards?.length,
      sampleBoardItems: safeAllBoardItems?.slice(0, 3).map((item) => ({
        boardId: item.boardId,
        itemType: item.itemType,
        originalId: item.originalId,
      })),
      sampleTaggings: safeAllTaggings?.slice(0, 3).map((t) => ({
        tagId: t.tagId,
        targetType: t.targetType,
        targetOriginalId: t.targetOriginalId,
      })),
    });

    const map = new Map();
    filteredMemos.forEach((memo) => {
      if (!memo || memo.id === undefined) return;
      const originalId = memo.originalId || memo.id.toString();

      // メモのタグを抽出
      const memoTaggings = safeAllTaggings.filter(
        (t) => t.targetType === "memo" && t.targetOriginalId === originalId,
      );
      const memoTags = memoTaggings
        .map((t) => safeAllTags.find((tag) => tag.id === t.tagId))
        .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

      // メモのボードを抽出（重複除去）
      const memoBoardItems = safeAllBoardItems.filter(
        (item) => item.itemType === "memo" && item.originalId === originalId,
      );

      // デバッグ用：特定メモの詳細確認
      if (memo.id === 379 || memo.id === 377) {
        console.log(`🔍 [メモID ${memo.id}] 詳細確認`, {
          memoId: memo.id,
          originalId,
          memoBoardItemsFound: memoBoardItems.length,
          memoBoardItems,
          memoTaggingsFound: memoTaggings.length,
          memoTaggings,
          // originalIdが一致するアイテムを検索
          matchingBoardItems: safeAllBoardItems.filter(
            (item) => item.originalId === originalId,
          ),
          matchingTaggings: safeAllTaggings.filter(
            (t) => t.targetOriginalId === originalId,
          ),
        });
      }
      const uniqueBoardIds = new Set(
        memoBoardItems.map((item) => item.boardId),
      );
      const memoBoards = Array.from(uniqueBoardIds)
        .map((boardId) => safeAllBoards.find((board) => board.id === boardId))
        .filter(
          (board): board is NonNullable<typeof board> => board !== undefined,
        );

      map.set(memo.id, { tags: memoTags, boards: memoBoards });
    });

    // デバッグ用：memoDataMapの中身確認
    console.log("🔍 [memoDataMap] 構築完了", {
      filteredMemosLength: filteredMemos?.length,
      mapSize: map.size,
      sampleMemos: Array.from(map.entries())
        .slice(0, 3)
        .map(([id, data]) => ({
          memoId: id,
          boardsLength: data.boards.length,
          tagsLength: data.tags.length,
          boards: data.boards.map((b: any) => ({ id: b.id, name: b.name })),
          tags: data.tags.map((t: any) => ({ id: t.id, name: t.name })),
        })),
    });

    return map;
  }, [filteredMemos, allTaggings, allBoardItems, allTags, allBoards]);

  const getSortValue = (memo: Memo, sortId: string): number => {
    if (!memo) return 0;
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
    if (!memo) return 0;
    return memo.updatedAt || memo.createdAt;
  };

  const renderMemo = (
    memo: Memo,
    props: {
      isChecked: boolean;
      onToggleCheck: () => void;
      onSelect: () => void;
      isSelected: boolean;
      showEditDate: boolean;
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => {
    const Component = viewMode === "card" ? MemoCard : MemoListItem;
    const memoData = memoDataMap.get(memo.id) || { tags: [], boards: [] };

    /* eslint-disable react/prop-types */
    const memoComponent = (
      <Component
        key={memo.id}
        memo={memo}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        onDoubleClick={() => onDoubleClick?.(memo)}
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
      itemType="memo"
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
  selectionMode = "select",
  checkedMemos,
  onToggleCheck,
  onSelectMemo,
  onDoubleClick,
  selectedMemoId,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
  sortOptions = [],
  isBoard = false,
  allTags = [],
  allBoards = [],
  allTaggings = [],
  allBoardItems = [],
  onSelectAll,
  isAllSelected,
}: DeletedMemoDisplayProps) {
  const getSortValue = (memo: DeletedMemo, sortId: string): number => {
    if (!memo) return 0;
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
    if (!memo) return 0;
    return memo.deletedAt;
  };

  const renderMemo = (
    memo: DeletedMemo,
    props: {
      isChecked: boolean;
      onToggleCheck: () => void;
      onSelect: () => void;
      isSelected: boolean;
      showEditDate: boolean;
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => {
    // 削除済みメモのタグ・ボード情報を取得
    // 削除済みメモの場合、originalIdは削除前の元のメモIDを文字列化したもの
    const originalId = memo.originalId || memo.id.toString();

    // このメモのタグを抽出
    const memoTaggings = allTaggings.filter(
      (t) => t.targetType === "memo" && t.targetOriginalId === originalId,
    );
    const memoTags = memoTaggings
      .map((t) => allTags.find((tag) => tag.id === t.tagId))
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

    // このメモのボードを抽出（重複除去）
    const memoBoardItems = allBoardItems.filter(
      (item) => item.itemType === "memo" && item.originalId === originalId,
    );
    const uniqueBoardIds = new Set(memoBoardItems.map((item) => item.boardId));
    const memoBoards = Array.from(uniqueBoardIds)
      .map((boardId) => allBoards.find((board) => board.id === boardId))
      .filter(
        (board): board is NonNullable<typeof board> => board !== undefined,
      );

    // 削除済みメモのボード表示調査ログ
    if (deletedMemos && deletedMemos.indexOf(memo) === 0) {
      // originalIdマッチング詳細調査

      const nearbyIds = allBoardItems
        .filter((item) => item.itemType === "memo")
        .map((item) => item.originalId)
        .filter((id) => Math.abs(parseInt(id) - parseInt(originalId)) <= 20);

      if (memoBoardItems.length === 0) {
      }
    }

    const Component = viewMode === "card" ? MemoCard : MemoListItem;
    /* eslint-disable react/prop-types */
    return (
      <Component
        key={memo.id}
        memo={memo}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        onDoubleClick={() => onDoubleClick?.(memo)}
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
      onSelectAll={onSelectAll}
      isAllSelected={isAllSelected}
    />
  );
}

export default MemoStatusDisplay;
