"use client";

import TrashIcon from "@/components/icons/trash-icon";

interface DeleteButtonProps {
  onDelete: () => void;
  className?: string;
}

function DeleteButton({ onDelete, className = "" }: DeleteButtonProps) {
  return (
    <button
      onClick={onDelete}
      className={`fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors ${className}`}
    >
      <TrashIcon />
    </button>
  );
}

export default DeleteButton;