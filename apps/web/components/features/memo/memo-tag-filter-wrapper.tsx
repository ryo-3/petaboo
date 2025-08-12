import type { Memo, DeletedMemo } from '@/src/types/memo';
import type { Tagging } from '@/src/types/tag';
import { ReactElement } from 'react';

interface MemoTagFilterWrapperProps {
  memo: Memo | DeletedMemo;
  selectedTagIds: number[];
  filterMode?: 'include' | 'exclude';
  children: ReactElement;
  variant?: 'normal' | 'deleted';
  allTaggings?: Tagging[];
}

/**
 * メモのタグフィルタリングを行うラッパーコンポーネント
 */
function MemoTagFilterWrapper({ 
  memo, 
  selectedTagIds, 
  filterMode = 'include', 
  children, 
  variant = 'normal',
  allTaggings = []
}: MemoTagFilterWrapperProps) {
  // フィルターが設定されていない場合は常に表示
  if (!selectedTagIds || selectedTagIds.length === 0) {
    return children;
  }

  // 削除済みメモの場合はoriginalIdを使用
  const isDeleted = variant === 'deleted';
  const memoOriginalId = isDeleted ? (memo as DeletedMemo).originalId : (memo.originalId || memo.id.toString());

  // メモに付けられたタグのID一覧を取得
  const memoTagIds = allTaggings
    .filter(tagging => 
      tagging.targetType === 'memo' && 
      tagging.targetOriginalId === memoOriginalId
    )
    .map(tagging => tagging.tagId);

  // フィルターモードに応じて表示判定
  let shouldShow: boolean;
  
  if (filterMode === 'exclude') {
    // 除外モード：選択されたタグのいずれも付いていない場合に表示
    shouldShow = !selectedTagIds.some(selectedId => memoTagIds.includes(selectedId));
  } else {
    // 含むモード（デフォルト）：選択されたタグのいずれかが付いている場合に表示
    shouldShow = selectedTagIds.some(selectedId => memoTagIds.includes(selectedId));
  }

  return shouldShow ? children : null;
}

export default MemoTagFilterWrapper;