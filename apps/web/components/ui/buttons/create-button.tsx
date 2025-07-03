"use client";

import PlusIcon from "@/components/icons/plus-icon";
import Tooltip from "@/components/ui/base/tooltip";

interface CreateButtonProps {
  onClick: () => void;
  color: "green" | "yellow" | string; // プリセットカラーまたはカスタムカラー
  label?: string;
  position?: "right" | "top" | "bottom";
  className?: string;
  disabled?: boolean;
  size?: "small" | "normal";
  showTooltip?: boolean;
}

function CreateButton({
  onClick,
  color,
  label = "新規作成",
  position = "right",
  className = "",
  disabled = false,
  size = "normal",
  showTooltip = true,
}: CreateButtonProps) {
  // プリセットカラーの定義
  const colorClasses = {
    green: "bg-Green hover:bg-Green/85",
    yellow: "bg-DeepBlue hover:bg-DeepBlue/85",
  };

  // カラークラスを決定（プリセットまたはカスタム）
  const bgColorClass =
    colorClasses[color as keyof typeof colorClasses] || color;

  const sizeClasses = {
    small: "p-2",
    normal: "p-2",
  };

  const iconSizeClasses = {
    small: "w-4 h-4",
    normal: "w-5 h-5",
  };

  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClasses[size]} rounded-lg text-white transition-colors ${bgColorClass} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <PlusIcon className={iconSizeClasses[size]} />
    </button>
  );

  return showTooltip ? (
    <Tooltip text={label} position={position}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

export default CreateButton;
