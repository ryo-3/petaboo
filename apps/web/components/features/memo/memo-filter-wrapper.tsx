import { useItemBoards } from '@/src/hooks/use-boards';
import type { Memo } from '@/src/types/memo';
import { ReactElement } from 'react';

interface MemoFilterWrapperProps {
  memo: Memo;
  selectedBoardIds: number[];
  filterMode?: 'include' | 'exclude';
  children: ReactElement;
}

/**
 * メモのボードフィルタリングを行うラッパーコンポーネント
 */
function MemoFilterWrapper({ memo, selectedBoardIds, filterMode = 'include', children }: MemoFilterWrapperProps) {
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

  // メモが所属するボードのID一覧を取得
  const memoBoardIds = boards ? boards.map(b => b.id) : [];

  // フィルターモードに応じて表示判定
  let shouldShow: boolean;
  
  if (filterMode === 'exclude') {
    // 除外モード：選択されたボードのいずれにも所属していない場合に表示
    shouldShow = !selectedBoardIds.some(selectedId => memoBoardIds.includes(selectedId));
  } else {
    // 含むモード（デフォルト）：選択されたボードのいずれかに所属している場合に表示
    shouldShow = selectedBoardIds.some(selectedId => memoBoardIds.includes(selectedId));
  }

  return shouldShow ? children : null;
}

export default MemoFilterWrapper;