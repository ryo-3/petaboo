import { useItemBoards } from '@/src/hooks/use-boards';
import type { Memo } from '@/src/types/memo';
import { ReactElement } from 'react';

interface MemoFilterWrapperProps {
  memo: Memo;
  selectedBoardIds: number[];
  children: ReactElement;
}

/**
 * メモのボードフィルタリングを行うラッパーコンポーネント
 */
function MemoFilterWrapper({ memo, selectedBoardIds, children }: MemoFilterWrapperProps) {
  // メモが所属するボード一覧を取得（フィルター無効時はundefinedを渡してクエリを無効化）
  const { data: boards, isLoading } = useItemBoards(
    'memo', 
    (selectedBoardIds && selectedBoardIds.length > 0) ? memo.id : undefined
  );

  // フィルターが設定されていない場合は常に表示
  if (!selectedBoardIds || selectedBoardIds.length === 0) {
    return children;
  }

  // ローディング中は非表示（ちらつき防止）
  if (isLoading) {
    return null;
  }

  // ボード情報がない場合は非表示
  if (!boards || boards.length === 0) {
    return null;
  }

  // メモが所属するボードのいずれかが選択されている場合のみ表示
  const memoBoardIds = boards.map(b => b.id);
  const shouldShow = selectedBoardIds.some(selectedId => memoBoardIds.includes(selectedId));

  return shouldShow ? children : null;
}

export default MemoFilterWrapper;