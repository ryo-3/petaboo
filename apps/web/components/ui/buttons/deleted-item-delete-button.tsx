import React from 'react';
import DeleteButton from './delete-button';
import { DELETE_BUTTON_POSITION } from '@/src/constants/ui';

interface DeletedItemDeleteButtonProps {
  onDelete: () => void;
  isAnimating: boolean;
}

/**
 * 削除済みアイテム表示時の右下削除ボタン
 * 削除済みメモ・タスクビューアーで共通使用
 */
export function DeletedItemDeleteButton({ onDelete, isAnimating }: DeletedItemDeleteButtonProps) {
  return (
    <div className={`${DELETE_BUTTON_POSITION} z-10`}>
      <DeleteButton
        data-right-panel-trash
        onDelete={onDelete}
        isAnimating={isAnimating}
        variant="danger"
      />
    </div>
  );
}