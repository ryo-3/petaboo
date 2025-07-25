import { useCallback } from 'react';

interface UseRightEditorDeleteConfig<T extends { id: number }> {
  item: T | null;
  deleteMutation: {
    mutateAsync: (id: number) => Promise<void>;
  };
  editorSelector: string; // '[data-memo-editor]' or '[data-task-editor]'
  setIsDeleting: (isDeleting: boolean) => void;
  onDeleteComplete: ((deletedItem: T) => void) | ((deletedItem: T, preDeleteDisplayOrder?: number[]) => void);
  executeApiFirst?: boolean; // Task=true, Memo=false
  restoreEditorVisibility?: boolean; // Task=true, Memo=false
}

/**
 * 右側エディターの削除処理を管理するカスタムフック
 * メモ・タスクの両方で共通使用
 */
export function useRightEditorDelete<T extends { id: number }>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  item: _item,
  deleteMutation,
  editorSelector,
  setIsDeleting,
  onDeleteComplete,
  executeApiFirst = false,
  restoreEditorVisibility = false,
}: UseRightEditorDeleteConfig<T>) {
  
  return useCallback(async (targetItem: T) => {
    setIsDeleting(true);
    
    // Task用のDOM順序取得
    let preDeleteDisplayOrder: number[] | undefined;
    if (executeApiFirst) {
      try {
        const { getTaskDisplayOrder } = await import('@/src/utils/domUtils');
        preDeleteDisplayOrder = getTaskDisplayOrder();
      } catch {
        // DOM順序取得に失敗した場合は無視
      }
    }

    // 右側ゴミ箱とエディターエリアを取得
    const rightTrashButton = document.querySelector(
      "[data-right-panel-trash]"
    ) as HTMLElement;
    const editorArea = document.querySelector(editorSelector) as HTMLElement;

    if (!rightTrashButton || !editorArea) {
      // アニメーション要素がない場合は直接削除
      try {
        await deleteMutation.mutateAsync(targetItem.id);
        onDeleteComplete(targetItem);
      } catch {
        setIsDeleting(false);
      }
      return;
    }

    try {
      // アニメーション実行（CSS版に変更）
      const { animateEditorContentToTrashCSS } = await import(
        "@/src/utils/deleteAnimation"
      );

      if (executeApiFirst) {
        // Task方式：先にAPI削除実行
        await deleteMutation.mutateAsync(targetItem.id);
        
        animateEditorContentToTrashCSS(editorArea, rightTrashButton, async () => {
          // エディター要素のvisibility復元（Task用）
          if (restoreEditorVisibility) {
            editorArea.style.visibility = 'visible';
            editorArea.style.pointerEvents = 'auto';
          }
          
          // DOM順序も一緒に渡す（Task用）
          if (onDeleteComplete.length >= 2) {
            (onDeleteComplete as (deletedItem: T, preDeleteDisplayOrder?: number[]) => void)(targetItem, preDeleteDisplayOrder);
          } else {
            (onDeleteComplete as (deletedItem: T) => void)(targetItem);
          }
        });
      } else {
        // Memo方式：アニメーション内でAPI削除実行
        animateEditorContentToTrashCSS(editorArea, rightTrashButton, async () => {
          try {
            await deleteMutation.mutateAsync(targetItem.id);
            onDeleteComplete(targetItem);
          } catch {
            setIsDeleting(false);
          }
        });
      }
    } catch (error) {
      setIsDeleting(false);
      throw error;
    }
  }, [
    deleteMutation,
    editorSelector,
    setIsDeleting,
    onDeleteComplete,
    executeApiFirst,
    restoreEditorVisibility,
  ]);
}