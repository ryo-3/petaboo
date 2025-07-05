"use client";

import { forwardRef } from "react";
import TrashIcon from "@/components/icons/trash-icon";

interface DeleteButtonProps {
  onDelete: () => void;
  className?: string;
  count?: number;
  isAnimating?: boolean;
  'data-right-panel-trash'?: boolean;
}

const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>(
  ({ onDelete, className = "", count, isAnimating = false, ...props }, ref) => {
    return (
      <div className={`${className} transition-opacity duration-300 ease-in-out`}>
        <button
          ref={ref}
          onClick={onDelete}
          className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full shadow-lg transition-colors relative"
          {...props}
        >
          <TrashIcon isOpen={isAnimating} />
          {count !== undefined && count > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </div>
    );
  }
);

DeleteButton.displayName = "DeleteButton";

export default DeleteButton;