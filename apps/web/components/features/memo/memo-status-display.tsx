"use client";

import ItemCard from "@/components/ui/layout/item-card";
import ItemListDisplay from "@/components/ui/layout/item-list-display";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import type { Attachment } from "@/src/hooks/use-attachments";
import { useMemo } from "react";

interface MemoStatusDisplayProps {
  memos: Memo[] | undefined;
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedMemos?: Set<number>;
  onToggleCheck?: (memoId: number) => void;
  onSelectMemo?: (memo: Memo) => void;
  onDoubleClick?: (memo: Memo) => void;
  selectedMemoId?: number;
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
    displayId: string;
    addedAt: number;
  }>;
  allAttachments?: Attachment[];
  teamMode?: boolean;
}

interface DeletedMemoDisplayProps {
  deletedMemos: DeletedMemo[] | undefined;
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedMemos?: Set<number>;
  onToggleCheck?: (memoId: number) => void;
  onSelectMemo?: (memo: DeletedMemo) => void;
  onDoubleClick?: (memo: DeletedMemo) => void;
  selectedMemoId?: number;
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
    displayId: string;
    addedAt: number;
  }>;
  allAttachments?: Attachment[];
  // 全選択機能
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  teamMode?: boolean;
}

function MemoStatusDisplay({
  memos,
  effectiveColumnCount,
  selectionMode = "select",
  checkedMemos,
  onToggleCheck,
  onSelectMemo,
  onDoubleClick,
  selectedMemoId,
  showBoardName = false,
  selectedBoardIds = [],
  boardFilterMode = "include",
  selectedTagIds = [],
  tagFilterMode = "include",
  sortOptions = [],
  isBoard = false,
  showTags = true,
  allTags,
  allBoards,
  allTaggings,
  allBoardItems,
  allAttachments,
  teamMode,
}: MemoStatusDisplayProps) {
  // フィルタリング済みのメモを取得
  const filteredMemos = useMemo(() => {
    let baseMemos = memos || [];

    // ボードフィルタリング
    if (selectedBoardIds && selectedBoardIds.length > 0 && allBoardItems) {
      baseMemos = baseMemos.filter((memo) => {
        if (!memo || memo.id === undefined) return false;

        // WORKAROUND: idとoriginalIdの両方でマッチング
        const displayId = memo.displayId || "";
        const memoId = String(memo.id);
        const memoDisplayId = memo.displayId;
        const memoIdentifiers = [displayId, memoId];
        if (teamMode && memoDisplayId) {
          memoIdentifiers.push(memoDisplayId);
        }

        // メモが所属するボードのID一覧を取得
        const memoBoardItems = allBoardItems.filter(
          (item) =>
            item.itemType === "memo" &&
            (memoIdentifiers.includes(item.displayId) ||
              memoIdentifiers.includes(item.itemId)),
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

        const memoOriginalId = memo.displayId || "";
        const memoDisplayId = memo.displayId;
        const memoIdentifiers = [memoOriginalId, String(memo.id)];
        if (teamMode && memoDisplayId) {
          memoIdentifiers.push(memoDisplayId);
        }

        // メモに付けられたタグのID一覧を取得
        const memoTagIds = allTaggings
          .filter(
            (tagging) =>
              tagging.targetType === "memo" &&
              memoIdentifiers.some(
                (id) =>
                  tagging.targetOriginalId === id ||
                  tagging.targetDisplayId === id,
              ),
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
    const safeAllAttachments = allAttachments || [];

    const map = new Map();
    filteredMemos.forEach((memo) => {
      if (!memo || memo.id === undefined) return;
      // WORKAROUND: displayIdが数値の場合もあるため、文字列に変換
      // さらに、idとoriginalIdの両方でマッチング（データ不整合対策）
      const displayId = memo.displayId || "";
      const memoId = String(memo.id);
      const memoDisplayId = memo.displayId;
      const memoIdentifiers = [displayId, memoId];
      if (teamMode && memoDisplayId) {
        memoIdentifiers.push(memoDisplayId);
      }

      // メモのタグを抽出
      const memoTaggings = safeAllTaggings.filter(
        (t) =>
          t.targetType === "memo" &&
          memoIdentifiers.some(
            (id) => t.targetOriginalId === id || t.targetDisplayId === id,
          ),
      );
      const memoTags = memoTaggings
        .map((t) => safeAllTags.find((tag) => tag.id === t.tagId))
        .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

      // メモのボードを抽出（重複除去）
      const memoBoardItems = safeAllBoardItems.filter(
        (item) =>
          item.itemType === "memo" &&
          (memoIdentifiers.includes(item.displayId) ||
            memoIdentifiers.includes(item.itemId)),
      );

      const uniqueBoardIds = new Set(
        memoBoardItems.map((item) => item.boardId),
      );
      const memoBoards = Array.from(uniqueBoardIds)
        .map((boardId) => safeAllBoards.find((board) => board.id === boardId))
        .filter(
          (board): board is NonNullable<typeof board> => board !== undefined,
        );

      // メモの添付ファイルを抽出（画像のみ）
      const memoAttachments = safeAllAttachments.filter((attachment) => {
        // attachedDisplayId または displayId を使用（API側の命名に対応）
        const attachmentDisplayId =
          attachment.attachedDisplayId || (attachment as any).displayId || "";
        return (
          memoIdentifiers.includes(attachmentDisplayId) &&
          attachment.mimeType.startsWith("image/")
        );
      });

      map.set(memo.id, {
        tags: memoTags,
        boards: memoBoards,
        attachments: memoAttachments,
      });
    });

    return map;
  }, [
    filteredMemos,
    allTaggings,
    allBoardItems,
    allTags,
    allBoards,
    allAttachments,
  ]);

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
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => {
    const memoData = memoDataMap.get(memo.id) || {
      tags: [],
      boards: [],
      attachments: [],
    };

    /* eslint-disable react/prop-types */
    const memoComponent = (
      <ItemCard
        key={memo.id}
        itemType="memo"
        item={memo}
        variant={props.variant}
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        onDoubleClick={() => onDoubleClick?.(memo)}
        isSelected={props.isSelected}
        showBoardName={props.showBoardName}
        showTags={props.showTags}
        selectionMode={selectionMode}
        // 全データ事前取得（ちらつき解消）
        preloadedTags={memoData.tags}
        preloadedBoards={memoData.boards}
        preloadedAttachments={memoData.attachments}
        teamMode={teamMode}
      />
    );

    return memoComponent;
    /* eslint-enable react/prop-types */
  };

  // フィルター適用時は個別コンポーネントで判定するため、空メッセージは表示しない

  return (
    <ItemListDisplay
      items={filteredMemos}
      effectiveColumnCount={effectiveColumnCount}
      selectionMode={selectionMode}
      checkedItems={checkedMemos}
      isBoard={isBoard}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectMemo}
      selectedItemId={selectedMemoId}
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
  effectiveColumnCount,
  selectionMode = "select",
  checkedMemos,
  onToggleCheck,
  onSelectMemo,
  onDoubleClick,
  selectedMemoId,
  showBoardName = false,
  showTags = true,
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
  allAttachments = [],
  onSelectAll,
  isAllSelected,
  teamMode,
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
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => {
    // 削除済みメモのタグ・ボード情報を取得
    // WORKAROUND: idとoriginalIdの両方でマッチング
    const displayId = memo.displayId || "";
    const memoId = String(memo.id);
    const memoDisplayId = memo.displayId;
    const memoIdentifiers = [displayId, memoId];
    if (teamMode && memoDisplayId) {
      memoIdentifiers.push(memoDisplayId);
    }

    // このメモのタグを抽出
    const memoTaggings = allTaggings.filter(
      (t) =>
        t.targetType === "memo" &&
        memoIdentifiers.some(
          (id) => t.targetOriginalId === id || t.targetDisplayId === id,
        ),
    );
    const memoTags = memoTaggings
      .map((t) => allTags.find((tag) => tag.id === t.tagId))
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

    // このメモのボードを抽出（重複除去）
    const memoBoardItems = allBoardItems.filter(
      (item) =>
        item.itemType === "memo" &&
        (memoIdentifiers.includes(item.displayId) ||
          memoIdentifiers.includes(item.itemId)),
    );
    const uniqueBoardIds = new Set(memoBoardItems.map((item) => item.boardId));
    const memoBoards = Array.from(uniqueBoardIds)
      .map((boardId) => allBoards.find((board) => board.id === boardId))
      .filter(
        (board): board is NonNullable<typeof board> => board !== undefined,
      );

    // このメモの添付ファイルを抽出（画像のみ）
    const memoAttachments = allAttachments.filter((attachment) => {
      const attachmentDisplayId = attachment.attachedDisplayId || "";
      return (
        memoIdentifiers.includes(attachmentDisplayId) &&
        attachment.mimeType.startsWith("image/")
      );
    });

    /* eslint-disable react/prop-types */
    return (
      <ItemCard
        key={memo.id}
        itemType="memo"
        item={memo}
        variant="deleted"
        isChecked={props.isChecked}
        onToggleCheck={props.onToggleCheck}
        onSelect={props.onSelect}
        onDoubleClick={() => onDoubleClick?.(memo)}
        isSelected={props.isSelected}
        showBoardName={props.showBoardName}
        showTags={props.showTags}
        selectionMode={selectionMode}
        preloadedTags={memoTags}
        preloadedBoards={memoBoards}
        preloadedAttachments={memoAttachments}
        teamMode={teamMode}
      />
    );
    /* eslint-enable react/prop-types */
  };

  return (
    <ItemListDisplay
      items={deletedMemos}
      effectiveColumnCount={effectiveColumnCount}
      selectionMode={selectionMode}
      checkedItems={checkedMemos}
      isBoard={isBoard}
      onToggleCheck={onToggleCheck}
      onSelectItem={onSelectMemo}
      selectedItemId={selectedMemoId}
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
