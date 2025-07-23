import React from 'react';
import Modal from '@/components/ui/modals/modal';

interface BoardChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  boardsToAdd: string[];
  boardsToRemove: string[];
  parentElement?: HTMLElement;
}

export default function BoardChangeModal({
  isOpen,
  onClose,
  onConfirm,
  boardsToAdd,
  boardsToRemove,
  parentElement: _parentElement // eslint-disable-line @typescript-eslint/no-unused-vars
}: BoardChangeModalProps) {
  // 削除するボードがない場合は表示しない
  if (boardsToRemove.length === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ボードから外す確認"
      maxWidth="sm"
      position="center"
    >
      <div className="space-y-4">
        <div>
          <p className="text-gray-700 mb-3">以下のボードからこのメモを外しますか？</p>
          <div className="bg-red-50 p-3 rounded-md">
            <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
              {boardsToRemove.map((boardName, index) => (
                <li key={index}>{boardName}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            外す
          </button>
        </div>
      </div>
    </Modal>
  );
}