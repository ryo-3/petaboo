"use client";

import Tooltip from "@/components/ui/base/tooltip";
import EyeIcon from "@/components/icons/eye-icon";
import CheckCircleIcon from "@/components/icons/check-circle-icon";

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
        mode === "select" ? "チェックモードに切り替え" : "選択モードに切り替え"
      }
      position="bottom"
    >
      <button
        onClick={handleToggle}
        className={`bg-gray-100 rounded-lg ${buttonSize} flex items-center justify-center transition-colors text-gray-500 hover:text-gray-700`}
      >
        {mode === "select" ? (
          <EyeIcon className={iconSize} />
        ) : (
          <CheckCircleIcon className={iconSize} />
        )}
      </button>
    </Tooltip>
  );
}

export default SelectionModeToggle;
