import CheckIcon from "../../icons/check-icon";
import SaveIcon from "../../icons/save-icon";
import Tooltip from "../base/tooltip";
import { useState, useEffect } from "react";

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [prevSaving, setPrevSaving] = useState(false);

  // isSavingがtrue→falseになったら（保存完了）、チェックマーク表示→フェードアウト
  useEffect(() => {
    if (prevSaving && !isSaving) {
      // 保存完了
      setShowSuccess(true);
      setIsFadingOut(false);

      // 1700ms後にフェードアウト開始（チェックマークは表示したまま）
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1700);

      // 2100ms後にチェックマーク非表示（フェードアウト完了後）
      const hideTimer = setTimeout(() => {
        setShowSuccess(false);
        setIsFadingOut(false);
      }, 2100);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
    if (prevSaving !== isSaving) {
      setPrevSaving(isSaving);
    }
  }, [isSaving, prevSaving]);

  const getTooltipText = () => {
    if (isSaving) return "保存中...";
    if (showSuccess) return "保存完了";
    return title;
  };

  return (
    <Tooltip text={getTooltipText()} position="bottom-right">
      <button
        onClick={onClick}
        disabled={disabled || isSaving || showSuccess}
        className={`save-button ${buttonSize} rounded-md flex items-center justify-center transition-colors duration-300 ${
          isSaving
            ? "bg-Green text-white cursor-not-allowed"
            : showSuccess && !isFadingOut
              ? "bg-Green text-white cursor-not-allowed"
              : disabled
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-Green text-gray-200 hover:text-white"
        } ${className}`}
      >
        {isSaving ? (
          <div
            className={`${iconSize} border-2 border-white border-t-transparent rounded-full animate-spin`}
          />
        ) : showSuccess ? (
          <CheckIcon className={iconSize} />
        ) : (
          <SaveIcon className={iconSize} />
        )}
      </button>
    </Tooltip>
  );
}

export default SaveButton;
