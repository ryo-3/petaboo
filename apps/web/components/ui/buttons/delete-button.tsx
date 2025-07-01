"use client";

import TrashIcon from "@/components/icons/trash-icon";

interface DeleteButtonProps {
  onDelete: () => void;
  className?: string;
  count?: number;
}

function DeleteButton({ onDelete, className = "", count }: DeleteButtonProps) {
  return (
    <div className={className}>
      <button
        onClick={onDelete}
        className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors relative"
      >
        <TrashIcon />
        {count && count > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

export default DeleteButton;