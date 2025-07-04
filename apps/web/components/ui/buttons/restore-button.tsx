"use client";

import RestoreIcon from "@/components/icons/restore-icon";
import Tooltip from "@/components/ui/base/tooltip";

interface RestoreButtonProps {
  onRestore: () => void;
  isRestoring?: boolean;
  disabled?: boolean;
  className?: string;
  count?: number;
  size?: "sm" | "md" | "lg";
}

function RestoreButton({
  onRestore,
  isRestoring = false,
  disabled = false,
  className = "",
  count,
  size = "md"
}: RestoreButtonProps) {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2", 
    lg: "p-3"
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  const tooltipText = count && count > 1 
    ? `${count}件を復元` 
    : count === 1 
    ? "1件を復元"
    : "復元";

  return (
    <Tooltip text={tooltipText} position="bottom">
      <button
        onClick={onRestore}
        disabled={disabled || isRestoring}
        className={`${sizeClasses[size]} rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors disabled:opacity-50 relative ${className}`}
      >
        {isRestoring ? (
          <div className={`${iconSizes[size]} border-2 border-gray-600 border-t-transparent rounded-full animate-spin`} />
        ) : (
          <>
            <RestoreIcon className={iconSizes[size]} />
            {count && count > 1 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </>
        )}
      </button>
    </Tooltip>
  );
}

export default RestoreButton;