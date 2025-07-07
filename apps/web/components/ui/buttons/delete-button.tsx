"use client";

import { forwardRef } from "react";
import TrashIcon from "@/components/icons/trash-icon";

interface DeleteButtonProps {
  onDelete: () => void;
  className?: string;
  count?: number;
  isAnimating?: boolean;
  variant?: "default" | "danger";
  'data-right-panel-trash'?: boolean;
}

const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>(
  ({ onDelete, className = "", count, isAnimating = false, variant = "default", ...props }, ref) => {
    return (
      <div className={`delete-button ${isAnimating ? 'animating' : ''} ${className}`}>
        <button
          ref={ref}
          onClick={onDelete}
          className={`${variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-gray-500 hover:bg-gray-600"} text-white p-2 rounded-full shadow-lg transition-colors relative`}
          {...props}
        >
          <TrashIcon />
          {count !== undefined && count > 0 && (
            <span className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium ${count > 99 ? 'w-7 h-6' : 'w-6 h-6'}`}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </div>
    );
  }
);

DeleteButton.displayName = "DeleteButton";

export default DeleteButton;