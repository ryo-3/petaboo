"use client";

import Tooltip from "@/components/ui/base/tooltip";

interface DateSortToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

function DateSortToggle({ isEnabled, onToggle }: DateSortToggleProps) {
  return (
    <Tooltip
      text={isEnabled ? "日付順を解除" : "日付順で並び替え（新しい順）"}
      position="bottom"
    >
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
        <button
          onClick={onToggle}
          className="p-1.5 rounded transition-colors text-gray-500 hover:text-gray-700"
        >
          <svg
            className={`w-4 h-4 transition-all duration-300 ${
              isEnabled ? "text-blue-600" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </Tooltip>
  );
}

export default DateSortToggle;