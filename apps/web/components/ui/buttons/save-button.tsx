import CheckIcon from "../../icons/check-icon";
import SaveIcon from "../../icons/save-icon";
import Tooltip from "../base/tooltip";
import { useEffect, useRef } from "react";

interface SaveButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isSaving: boolean;
  savedSuccessfully?: boolean;
  title?: string;
  buttonSize?: string;
  iconSize?: string;
  className?: string;
}

function SaveButton({
  onClick,
  disabled = false,
  isSaving,
  savedSuccessfully = false,
  title = "保存 (Ctrl+S)",
  buttonSize = "size-7",
  iconSize = "size-4",
  className = "",
}: SaveButtonProps) {
  const prevDisabledRef = useRef(disabled);

  useEffect(() => {
    if (prevDisabledRef.current !== disabled) {
      console.log("🔵 [SaveButton] disabled変化:", {
        prev: prevDisabledRef.current,
        current: disabled,
        isSaving,
        savedSuccessfully,
        stack: new Error().stack?.split("\n").slice(2, 5).join("\n"),
      });
      prevDisabledRef.current = disabled;
    }
  }, [disabled, isSaving, savedSuccessfully]);

  const getTooltipText = () => {
    if (isSaving) return "保存中...";
    if (savedSuccessfully) return "保存完了";
    return title;
  };

  return (
    <Tooltip text={getTooltipText()} position="bottom-right">
      <button
        onClick={onClick}
        disabled={disabled || isSaving || savedSuccessfully}
        className={`save-button ${savedSuccessfully ? "success" : ""} ${buttonSize} rounded-md transition-colors flex items-center justify-center ${
          isSaving
            ? "bg-Green text-white cursor-not-allowed"
            : disabled || savedSuccessfully
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-Green text-gray-200 hover:text-white"
        } ${className}`}
      >
        {isSaving ? (
          <div
            className={`${iconSize} border-2 border-gray-100 border-t-transparent rounded-full animate-spin`}
          />
        ) : savedSuccessfully ? (
          <CheckIcon className={iconSize} />
        ) : (
          <SaveIcon className={iconSize} />
        )}
      </button>
    </Tooltip>
  );
}

export default SaveButton;
