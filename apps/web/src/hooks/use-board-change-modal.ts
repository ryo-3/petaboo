import { useState, useCallback } from "react";

interface BoardChanges {
  toAdd: string[];
  toRemove: string[];
}

/**
 * ボード変更モーダルの状態管理フック
 * memo-editor と task-editor で共通利用
 */
export function useBoardChangeModal(initialBoardIds: string[] = []) {
  const [selectedBoardIds, setSelectedBoardIds] =
    useState<string[]>(initialBoardIds);
  const [showBoardChangeModal, setShowBoardChangeModal] = useState(false);
  const [pendingBoardChanges, setPendingBoardChanges] = useState<BoardChanges>({
    toAdd: [],
    toRemove: [],
  });

  // ボード変更ハンドラー（選択状態のみ更新）
  const handleBoardChange = useCallback((newBoardIds: string | string[]) => {
    const newIds = Array.isArray(newBoardIds) ? newBoardIds : [newBoardIds];
    setSelectedBoardIds(newIds);
  }, []);

  // モーダル表示（保存時に呼び出される）
  const showModal = useCallback((changes: BoardChanges) => {
    setPendingBoardChanges(changes);
    setShowBoardChangeModal(true);
  }, []);

  // モーダル確認
  const handleConfirmBoardChange = useCallback(() => {
    setShowBoardChangeModal(false);
    return pendingBoardChanges;
  }, [pendingBoardChanges]);

  // モーダルキャンセル
  const handleCancelBoardChange = useCallback(() => {
    setShowBoardChangeModal(false);
    setPendingBoardChanges({ toAdd: [], toRemove: [] });
  }, []);

  // 初期化（コンポーネントマウント時）
  const initializeBoardIds = useCallback((boardIds: string[]) => {
    setSelectedBoardIds(boardIds);
  }, []);

  return {
    // State
    selectedBoardIds,
    showBoardChangeModal,
    pendingBoardChanges,

    // Actions
    handleBoardChange,
    showModal,
    handleConfirmBoardChange,
    handleCancelBoardChange,
    initializeBoardIds,
    setSelectedBoardIds,
  };
}
