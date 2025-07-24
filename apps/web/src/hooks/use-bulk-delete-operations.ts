import { useCallback, useState, ReactNode } from 'react';
import { useBulkDelete } from '@/components/ui/modals';
import { useDeleteMemo } from '@/src/hooks/use-memos';
import { useDeleteTask } from '@/src/hooks/use-tasks';
import { useRemoveItemFromBoard } from '@/src/hooks/use-boards';
import { useBulkAnimation } from '@/src/hooks/use-bulk-animation';
import { executeWithAnimation } from '@/src/utils/bulkAnimationUtils';

interface UseBulkDeleteOperationsProps {
  boardId: number;
  checkedMemos: Set<string | number>;
  checkedTasks: Set<string | number>;
  setCheckedMemos: (value: Set<string | number>) => void;
  setCheckedTasks: (value: Set<string | number>) => void;
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

interface UseBulkDeleteOperationsReturn {
  isMemoDeleting: boolean;
  isMemoLidOpen: boolean;
  deletingItemType: 'memo' | 'task' | null;
  bulkDelete: ReturnType<typeof useBulkDelete>;
  handleBulkDelete: (itemType: 'memo' | 'task', customMessage?: ReactNode) => Promise<void>;
  handleRemoveFromBoard: () => Promise<void>;
  setDeletingItemType: (type: 'memo' | 'task' | null) => void;
  bulkAnimation: ReturnType<typeof useBulkAnimation>;
}

/**
 * 一括削除操作を管理するカスタムフック
 * ボード詳細画面で使用される削除関連のロジックを集約
 */
export function useBulkDeleteOperations({
  boardId,
  checkedMemos,
  checkedTasks,
  setCheckedMemos,
  setCheckedTasks,
  deleteButtonRef,
}: UseBulkDeleteOperationsProps): UseBulkDeleteOperationsReturn {
  const [isMemoDeleting, setIsMemoDeleting] = useState(false);
  const [isMemoLidOpen, setIsMemoLidOpen] = useState(false);
  const [deletingItemType, setDeletingItemType] = useState<'memo' | 'task' | null>(null);
  
  // アニメーション管理
  const bulkAnimation = useBulkAnimation({
    checkedItems: new Set(Array.from(checkedMemos).filter(id => typeof id === 'number') as number[]),
    checkedDeletedItems: new Set(Array.from(checkedTasks).filter(id => typeof id === 'number') as number[]),
  });
  
  // 削除関連のフック
  const bulkDelete = useBulkDelete();
  const deleteMemoMutation = useDeleteMemo();
  const deleteTaskMutation = useDeleteTask();
  const removeItemFromBoard = useRemoveItemFromBoard();
  
  // アニメーション付き削除実行関数
  const executeDeleteWithAnimation = useCallback(async (ids: number[], itemType: 'memo' | 'task') => {
    const onStateUpdate = () => {
      // ボード詳細では特別な状態更新は不要
    };

    const onCheckStateUpdate = (processedIds: number[]) => {
      if (itemType === 'memo') {
        const newCheckedMemos = new Set(checkedMemos);
        processedIds.forEach((id) => newCheckedMemos.delete(id));
        setCheckedMemos(newCheckedMemos);
      } else {
        const newCheckedTasks = new Set(checkedTasks);
        processedIds.forEach((id) => newCheckedTasks.delete(id));
        setCheckedTasks(newCheckedTasks);
      }
    };

    const onApiCall = async (id: number) => {
      if (itemType === 'memo') {
        await deleteMemoMutation.mutateAsync(id);
      } else {
        await deleteTaskMutation.mutateAsync(id);
      }
    };

    await executeWithAnimation({
      ids,
      isPartial: false,
      buttonRef: deleteButtonRef,
      dataAttribute: itemType === 'memo' ? 'data-memo-id' : 'data-task-id',
      onStateUpdate,
      onCheckStateUpdate,
      onApiCall,
      initializeAnimation: bulkAnimation.initializeAnimation,
      startCountdown: bulkAnimation.startCountdown,
      finalizeAnimation: bulkAnimation.finalizeAnimation,
      setIsProcessing: setIsMemoDeleting,
      setIsLidOpen: setIsMemoLidOpen,
    });
  }, [checkedMemos, checkedTasks, setCheckedMemos, setCheckedTasks, deleteMemoMutation, deleteTaskMutation, deleteButtonRef, bulkAnimation]);
  
  // 一括削除ハンドラー
  const handleBulkDelete = useCallback(async (itemType: 'memo' | 'task', customMessage?: ReactNode) => {
    const targetIds = itemType === 'memo' ? Array.from(checkedMemos) : Array.from(checkedTasks);
    if (targetIds.length === 0) return;

    setDeletingItemType(itemType);
    setIsMemoDeleting(true);
    setIsMemoLidOpen(true);

    await bulkDelete.confirmBulkDelete(
      targetIds as number[],
      1,
      async (ids: (string | number)[]) => {
        // アニメーション付き削除処理
        await executeDeleteWithAnimation(ids as number[], itemType);
      },
      customMessage
    );
  }, [checkedMemos, checkedTasks, bulkDelete, executeDeleteWithAnimation]);

  // ボードから削除の処理
  const handleRemoveFromBoard = useCallback(async () => {
    const targetIds = deletingItemType === 'memo' ? Array.from(checkedMemos) : Array.from(checkedTasks);
    
    try {
      for (const id of targetIds) {
        await removeItemFromBoard.mutateAsync({
          boardId,
          itemId: id as number,
          itemType: deletingItemType!,
        });
      }
      
      // 選択をクリア
      if (deletingItemType === 'memo') {
        setCheckedMemos(new Set());
      } else {
        setCheckedTasks(new Set());
      }
      
      bulkDelete.handleCancel();
    } catch {
      // エラーは上位でハンドリング
    } finally {
      setDeletingItemType(null);
    }
  }, [deletingItemType, checkedMemos, checkedTasks, boardId, bulkDelete, setCheckedMemos, setCheckedTasks, removeItemFromBoard]);
  
  return {
    isMemoDeleting,
    isMemoLidOpen,
    deletingItemType,
    bulkDelete,
    handleBulkDelete,
    handleRemoveFromBoard,
    setDeletingItemType,
    bulkAnimation,
  };
}