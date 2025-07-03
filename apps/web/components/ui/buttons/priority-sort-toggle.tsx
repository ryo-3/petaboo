"use client";

import Tooltip from "@/components/ui/base/tooltip";

interface PrioritySortToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

function PrioritySortToggle({ isEnabled, onToggle }: PrioritySortToggleProps) {
  return (
    <Tooltip
      text={isEnabled ? "優先度順を解除" : "優先度順で並び替え"}
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
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>
    </Tooltip>
  );
}

export default PrioritySortToggle;