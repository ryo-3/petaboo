"use client";

import { useCallback, useState } from "react";
import Tooltip from "@/components/ui/base/tooltip";

interface ContinuousCreateButtonProps {
  storageKey: string; // "memo-continuous-create-mode" or "task-continuous-create-mode"
  onModeChange?: (enabled: boolean) => void;
  activeColor?: string; // カスタムカラー（ONの時）
  activeHoverColor?: string; // カスタムホバーカラー（ONの時）
}

export default function ContinuousCreateButton({
  storageKey,
  onModeChange,
  activeColor = "bg-gray-500",
  activeHoverColor = "hover:bg-gray-600",
}: ContinuousCreateButtonProps) {
  // 連続作成モード状態（localStorageから初期値を取得）
  const [continuousCreateMode, setContinuousCreateMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) === "true";
    }
    return false;
  });

  // 連続作成モードの切り替え
  const toggleContinuousCreateMode = useCallback(() => {
    const newMode = !continuousCreateMode;
    setContinuousCreateMode(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, newMode.toString());
    }
    onModeChange?.(newMode);
  }, [continuousCreateMode, storageKey, onModeChange]);

  return (
    <Tooltip
      text={continuousCreateMode ? "連続作成モード: ON" : "連続作成モード: OFF"}
      position="bottom"
    >
      <button
        onClick={toggleContinuousCreateMode}
        className={`size-7 rounded-md transition-colors flex items-center justify-center ${
          continuousCreateMode
            ? `${activeColor} text-white ${activeHoverColor}`
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        <svg
          className="size-4 rotate-[70deg] scale-x-[-1]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* 連続作成を表すリフレッシュ/リピートアイコン */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </Tooltip>
  );
}

// 連続作成モードの状態を取得するヘルパー関数
export function getContinuousCreateMode(storageKey: string): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem(storageKey) === "true";
  }
  return false;
}
