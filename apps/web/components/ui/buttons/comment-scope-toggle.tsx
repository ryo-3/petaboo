"use client";

import Tooltip from "@/components/ui/base/tooltip";

interface CommentScopeToggleProps {
  scope: "board" | "items";
  onScopeChange: (scope: "board" | "items") => void;
  buttonSize?: string;
  iconSize?: string;
}

export default function CommentScopeToggle({
  scope,
  onScopeChange,
  buttonSize = "size-7",
  iconSize = "size-4",
}: CommentScopeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      <Tooltip text="ボードコメント" position="bottom">
        <button
          onClick={() => onScopeChange("board")}
          className={`${buttonSize} flex items-center justify-center rounded transition-colors ${
            scope === "board"
              ? "bg-white text-gray-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg
            className={iconSize}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      </Tooltip>
      <Tooltip text="アイテムコメント" position="bottom">
        <button
          onClick={() => onScopeChange("items")}
          className={`${buttonSize} flex items-center justify-center rounded transition-colors ${
            scope === "items"
              ? "bg-white text-gray-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg
            className={iconSize}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}
