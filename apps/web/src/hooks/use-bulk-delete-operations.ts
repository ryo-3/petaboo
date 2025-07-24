import { useCallback, useState, ReactNode } from 'react';
import { useBulkDelete } from '@/components/ui/modals';
import { useDeleteMemo } from '@/src/hooks/use-memos';
import { useDeleteTask } from '@/src/hooks/use-tasks';
import { useRemoveItemFromBoard } from '@/src/hooks/use-boards';

interface UseBulkDeleteOperationsProps {
  boardId: number;
  checkedMemos: Set<string | number>;
  checkedTasks: Set<string | number>;
  setCheckedMemos: (value: Set<string | number>) => void;
  setCheckedTasks: (value: Set<string | number>) => void;
}

interface UseBulkDeleteOperationsReturn {
  isMemoDeleting: boolean;
  isMemoLidOpen: boolean;
  deletingItemType: 'memo' | 'task' | null;
  bulkDelete: ReturnType<typeof useBulkDelete>;
  handleBulkDelete: (itemType: 'memo' | 'task', customMessage?: ReactNode) => Promise<void>;
  handleRemoveFromBoard: () => Promise<void>;
  setDeletingItemType: (type: 'memo' | 'task' | null) => void;
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
}: UseBulkDeleteOperationsProps): UseBulkDeleteOperationsReturn {
  const [isMemoDeleting, setIsMemoDeleting] = useState(false);
  const [isMemoLidOpen, setIsMemoLidOpen] = useState(false);
  const [deletingItemType, setDeletingItemType] = useState<'memo' | 'task' | null>(null);
  
  // 削除関連のフック
  const bulkDelete = useBulkDelete();
  const deleteMemoMutation = useDeleteMemo();
  const deleteTaskMutation = useDeleteTask();
  const removeItemFromBoard = useRemoveItemFromBoard();
  
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
        // 完全削除の処理
        for (const id of ids) {
          if (itemType === 'memo') {
            await deleteMemoMutation.mutateAsync(id as number);
          } else {
            await deleteTaskMutation.mutateAsync(id as number);
          }
        }
        // 選択をクリア
        if (itemType === 'memo') {
          setCheckedMemos(new Set());
        } else {
          setCheckedTasks(new Set());
        }
      },
      customMessage
    );
  }, [checkedMemos, checkedTasks, bulkDelete, deleteMemoMutation, deleteTaskMutation, setCheckedMemos, setCheckedTasks]);

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
  };
}