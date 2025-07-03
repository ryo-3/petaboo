"use client";

import Tooltip from "@/components/ui/base/tooltip";
import EyeIcon from "@/components/icons/eye-icon";
import CheckCircleIcon from "@/components/icons/check-circle-icon";

interface SelectionModeToggleProps {
  mode: "select" | "check";
  onModeChange: (mode: "select" | "check") => void;
}

function SelectionModeToggle({ mode, onModeChange }: SelectionModeToggleProps) {
  const handleToggle = () => {
    onModeChange(mode === "select" ? "check" : "select");
  };

  return (
    <Tooltip
      text={
        mode === "select" ? "チェックモードに切り替え" : "選択モードに切り替え"
      }
      position="bottom"
    >
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg ">
        <button
          onClick={handleToggle}
          className={`p-1.5 rounded transition-colors relative overflow-hidden ${
            mode === "select" ? "text-gray-500 hover:text-gray-700" : ""
          }`}
        >
          <div className="relative w-5 h-5">
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                mode === "select" 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-75"
              }`}
            >
              <EyeIcon className="w-5 h-5" />
            </div>
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                mode === "check" 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-75"
              }`}
            >
              <CheckCircleIcon className="w-5 h-5" />
            </div>
          </div>
        </button>
      </div>
    </Tooltip>
  );
}

export default SelectionModeToggle;
