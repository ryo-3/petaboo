import ItemFilterWrapper from "@/components/shared/item-filter-wrapper";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import { ReactElement } from "react";

interface MemoFilterWrapperProps {
  memo: Memo | DeletedMemo;
  selectedBoardIds: number[];
  filterMode?: "include" | "exclude";
  children: ReactElement;
  variant?: "normal" | "deleted";
}

/**
 * メモのボードフィルタリングを行うラッパーコンポーネント
 * 内部的に共通のItemFilterWrapperを使用
 */
function MemoFilterWrapper({
  memo,
  selectedBoardIds,
  filterMode = "include",
  children,
  variant = "normal",
}: MemoFilterWrapperProps) {
  return (
    <ItemFilterWrapper
      item={memo}
      selectedBoardIds={selectedBoardIds}
      filterMode={filterMode}
      itemType="memo"
      variant={variant}
    >
      {children}
    </ItemFilterWrapper>
  );
}

export default MemoFilterWrapper;
