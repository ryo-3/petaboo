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
  parentElement
}: BoardChangeModalProps) {
  const hasChanges = boardsToAdd.length > 0 || boardsToRemove.length > 0;

  if (!hasChanges) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ボード変更の確認"
      maxWidth="sm"
      position="right-panel"
    >
      <div className="space-y-4">
        {boardsToAdd.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">追加するボード:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {boardsToAdd.map((boardName, index) => (
                <li key={index}>{boardName}</li>
              ))}
            </ul>
          </div>
        )}
        
        {boardsToRemove.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">削除するボード:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {boardsToRemove.map((boardName, index) => (
                <li key={index}>{boardName}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}