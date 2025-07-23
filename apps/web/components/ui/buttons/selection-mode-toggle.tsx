"use client";

import Tooltip from "@/components/ui/base/tooltip";

interface SelectionModeToggleProps {
  mode: "select" | "check";
  onModeChange: (mode: "select" | "check") => void;
  buttonSize: string;
  iconSize: string;
}

function SelectionModeToggle({ mode, onModeChange, buttonSize, iconSize }: SelectionModeToggleProps) {
  const handleToggle = () => {
    onModeChange(mode === "select" ? "check" : "select");
  };

  return (
    <Tooltip
      text={
        mode === "select" ? "チェックモード" : "チェックモード解除"
      }
      position="bottom"
    >
      <button
        onClick={handleToggle}
        className={`bg-gray-100 rounded-lg ${buttonSize} flex items-center justify-center transition-colors ${
          mode === "check" 
            ? "text-Green hover:text-Green/90" 
            : "text-gray-400 hover:text-gray-500"
        }`}
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill={mode === "check" ? "currentColor" : "none"}
          />
          <path
            d="M9 12l2 2 4-4"
            stroke={mode === "check" ? "#fff" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </Tooltip>
  );
}

export default SelectionModeToggle;
