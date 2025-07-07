"use client";

import RestoreIcon from "@/components/icons/restore-icon";
import Tooltip from "@/components/ui/base/tooltip";

interface RestoreButtonProps {
  onRestore: () => void;
  isRestoring?: boolean;
  disabled?: boolean;
  className?: string;
  count?: number;
  buttonSize?: string;
  iconSize?: string;
  tooltipPosition?: 'top' | 'bottom' | 'right';
  // アニメーション付きカウンター用
  animatedCount?: number;
  useAnimatedCount?: boolean;
}

function RestoreButton({
  onRestore,
  isRestoring = false,
  disabled = false,
  className = "",
  count,
  buttonSize = "size-8",
  iconSize = "size-4",
  tooltipPosition = "bottom",
  animatedCount,
  useAnimatedCount = false
}: RestoreButtonProps) {

  // アニメーション付きカウンターを使用する場合はanimatedCountを優先
  const displayCount = useAnimatedCount ? animatedCount : count;
  
  // デバッグログ（一時的）
  // if (useAnimatedCount) {
  //   console.log('🎯 RestoreButton animatedCount:', { animatedCount, count, displayCount, useAnimatedCount });
  // }

  const tooltipText = displayCount && displayCount > 1 
    ? `${displayCount}件を復元` 
    : displayCount === 1 
    ? "1件を復元"
    : "復元";

  return (
    <Tooltip text={tooltipText} position={tooltipPosition}>
      <button
        onClick={onRestore}
        disabled={disabled || isRestoring}
        className={`${buttonSize} rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors disabled:opacity-50 relative flex items-center justify-center ${className}`}
      >
        {isRestoring ? (
          <div className={`${iconSize} border-2 border-gray-600 border-t-transparent rounded-full animate-spin`} />
        ) : (
          <>
            <RestoreIcon className={iconSize} />
            {displayCount && displayCount > 0 && (
              <span className={`absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium ${displayCount > 99 ? 'w-7 h-6' : 'w-6 h-6'}`}>
                {displayCount > 99 ? '99+' : displayCount}
              </span>
            )}
          </>
        )}
      </button>
    </Tooltip>
  );
}

export default RestoreButton;