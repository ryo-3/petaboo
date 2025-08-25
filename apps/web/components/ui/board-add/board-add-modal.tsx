"use client";

import { useState, useCallback } from 'react';
import BoardSelectionModal from '@/components/ui/modals/board-selection-modal';
import { useAddItemToBoard } from '@/src/hooks/use-boards';

const BOARD_ADD_SUCCESS_DELAY = 3000; // ボード追加成功時の待機時間（ミリ秒）
const MINIMUM_LOADING_TIME = 1000; // 追加中状態の最低表示時間（ミリ秒）

interface BoardAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: { id: number; name: string }[];
  selectedItemCount: number;
  itemType: 'memo' | 'task';
  selectedItems: string[];
  allItems: any[]; // メモまたはタスクの配列
  onSuccess: () => void; // 選択をクリアするコールバック
  excludeBoardId?: number; // 除外するボードID（通常は現在のボード）
}

export default function BoardAddModal({
  isOpen,
  onClose,
  boards,
  selectedItemCount,
  itemType,
  selectedItems,
  allItems,
  onSuccess,
  excludeBoardId
}: BoardAddModalProps) {
  const [selectedBoardIdsForAdd, setSelectedBoardIdsForAdd] = useState<number[]>([]);
  const [isAddingToBoard, setIsAddingToBoard] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const addItemToBoard = useAddItemToBoard();

  // 現在のボードを一番上に移動し、グレーアウト表示用のフラグを追加
  const processedBoards = excludeBoardId 
    ? (() => {
        const currentBoard = boards.find(board => board.id === excludeBoardId);
        const otherBoards = boards.filter(board => board.id !== excludeBoardId);
        return currentBoard 
          ? [{ ...currentBoard, isCurrentBoard: true }, ...otherBoards.map(board => ({ ...board, isCurrentBoard: false }))]
          : boards.map(board => ({ ...board, isCurrentBoard: false }));
      })()
    : boards.map(board => ({ ...board, isCurrentBoard: false }));

  const handleAddToBoard = useCallback(async () => {
    if (selectedItems.length === 0 || selectedBoardIdsForAdd.length === 0) return;

    const startTime = Date.now();
    setIsAddingToBoard(true);

    try {
      const promises: Promise<unknown>[] = [];
      
      for (const boardId of selectedBoardIdsForAdd) {
        for (const itemId of selectedItems) {
          const item = allItems.find(i => i.id.toString() === itemId || i.id === parseInt(itemId));
          if (item) {
            promises.push(
              addItemToBoard.mutateAsync({
                boardId,
                data: {
                  itemType,
                  itemId: item.originalId || item.id.toString(),
                },
              }).catch((error) => {
                // エラーメッセージから重複エラーかどうかを判定
                const errorMessage = error?.message || error?.toString() || '';
                if (errorMessage.includes('already exists') || 
                    errorMessage.includes('duplicate') || 
                    errorMessage.includes('重複') ||
                    errorMessage.includes('既に存在')) {
                  // 既に追加済みの場合はスルー（成功扱い）
                  return Promise.resolve();
                } else {
                  // その他のエラーは再スロー
                  throw error;
                }
              })
            );
          }
        }
      }

      await Promise.all(promises);
      
      // 最低表示時間を確保
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime);
      
      setTimeout(() => {
        // 追加完了状態に変更
        setIsCompleted(true);
        setIsAddingToBoard(false);
        
        // 選択をクリア（即座に実行）
        onSuccess();
        
        // ボード選択はリセットしない（ユーザーが手動で閉じるまで保持）
      }, remainingTime);
      
    } catch (error) {
      console.error('ボードに追加中にエラーが発生しました:', error);
      alert('ボードへの追加に失敗しました。しばらくしてから再度お試しください。');
      setIsAddingToBoard(false);
      setIsCompleted(false);
    }
  }, [selectedItems, selectedBoardIdsForAdd, allItems, itemType, addItemToBoard, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    // モーダルを閉じる時に状態をリセット
    setSelectedBoardIdsForAdd([]);
    setIsAddingToBoard(false);
    setIsCompleted(false);
    onClose();
  }, [onClose]);

  return (
    <BoardSelectionModal
      isOpen={isOpen}
      onClose={handleClose}
      boards={processedBoards}
      selectedBoardIds={selectedBoardIdsForAdd}
      onSelectionChange={setSelectedBoardIdsForAdd}
      title="ボードに追加"
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            選択中の{itemType === 'memo' ? 'メモ' : 'タスク'}: {selectedItemCount}件
          </span>
          <button
            onClick={handleAddToBoard}
            className="px-4 py-1.5 bg-light-Blue text-white rounded disabled:opacity-50"
            disabled={selectedBoardIdsForAdd.length === 0 || isAddingToBoard || isCompleted}
          >
            {isCompleted ? '追加済' : isAddingToBoard ? '追加中...' : '追加する'}
          </button>
        </div>
      }
    />
  );
}