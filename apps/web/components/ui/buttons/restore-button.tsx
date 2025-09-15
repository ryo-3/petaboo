"use client";

import RestoreIcon from "@/components/icons/restore-icon";
import Tooltip from "@/components/ui/base/tooltip";
import React from "react";

interface RestoreButtonProps {
  onRestore: () => void;
  isRestoring?: boolean;
  disabled?: boolean;
  className?: string;
  count?: number;
  buttonSize?: string;
  iconSize?: string;
  tooltipPosition?: "top" | "bottom" | "right";
  // アニメーション付きカウンター用
  animatedCount?: number;
  useAnimatedCount?: boolean;
  // ref用
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

function RestoreButton({
  onRestore,
  isRestoring = false,
  disabled = false,
  className = "",
  count,
  buttonSize = "size-8",
  iconSize = "size-4",
  tooltipPosition = "top",
  animatedCount,
  useAnimatedCount = false,
  buttonRef,
}: RestoreButtonProps) {
  // アニメーション付きカウンターを使用する場合はanimatedCountを優先
  const displayCount = useAnimatedCount ? animatedCount : count;

  const tooltipText =
    displayCount && displayCount > 1
      ? `${displayCount}件を復元`
      : displayCount === 1
        ? "1件を復元"
        : "復元";

  return (
    <Tooltip text={tooltipText} position={tooltipPosition}>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={onRestore}
          disabled={disabled || isRestoring}
          className={`${buttonSize} rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors relative flex items-center justify-center ${className}`}
        >
          <RestoreIcon
            className={`${iconSize} ${isRestoring ? "animate-spin" : ""}`}
          />
        </button>
        {displayCount !== undefined && displayCount > 0 && (
          <span
            className={`absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium ${displayCount > 999 ? "w-8 h-6" : displayCount > 99 ? "w-7 h-6" : "w-6 h-6"}`}
          >
            {displayCount > 999 ? "999+" : displayCount}
          </span>
        )}
      </div>
    </Tooltip>
  );
}

export default RestoreButton;
