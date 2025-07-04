"use client";

import ConfirmationModal from "./confirmation-modal";

interface BulkRestoreConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  itemType: "memo" | "task";
  isLoading?: boolean;
}

export function BulkRestoreConfirmation({
  isOpen,
  onClose,
  onConfirm,
  count,
  itemType,
  isLoading = false,
}: BulkRestoreConfirmationProps) {
  const itemTypeName = itemType === "memo" ? "メモ" : "タスク";

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="復元の確認"
      message={`選択した${count}件の${itemTypeName}を復元しますか？`}
      confirmText="復元する"
      cancelText="キャンセル"
      variant="primary"
      isLoading={isLoading}
    />
  );
}
