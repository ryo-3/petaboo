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
  // アニメーション付きカウンター用
  animatedCount?: number;
  useAnimatedCount?: boolean;
}

const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>(
  ({ 
    onDelete, 
    className = "", 
    count, 
    isAnimating = false, 
    variant = "default", 
    animatedCount,
    useAnimatedCount = false,
    ...props 
  }, ref) => {
    // アニメーション付きカウンターを使用する場合はanimatedCountを優先
    const displayCount = useAnimatedCount ? animatedCount : count;
    
    return (
      <div className={`delete-button ${isAnimating ? 'animating' : ''} ${className}`}>
        <button
          ref={ref}
          onClick={onDelete}
          className={`${variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-gray-500 hover:bg-gray-600"} text-white p-2 rounded-full shadow-lg transition-colors relative`}
          {...props}
        >
          <TrashIcon isLidOpen={isAnimating} />
          {displayCount !== undefined && displayCount >= 0 && (
            <span className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium ${displayCount > 99 ? 'w-7 h-6' : 'w-6 h-6'}`}>
              {displayCount > 99 ? '99+' : displayCount}
            </span>
          )}
        </button>
      </div>
    );
  }
);

DeleteButton.displayName = "DeleteButton";

export default DeleteButton;