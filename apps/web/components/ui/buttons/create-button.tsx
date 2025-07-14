"use client";

import PlusIcon from "@/components/icons/plus-icon";
import Tooltip from "@/components/ui/base/tooltip";

interface CreateButtonProps {
  onClick: () => void;
  color: "green" | "yellow" | "blue" | string; // プリセットカラーまたはカスタムカラー
  label?: string;
  position?: "right" | "top" | "bottom";
  className?: string;
  disabled?: boolean;
  size?: "small" | "normal";
  customSize?: {
    padding?: string;
    iconSize?: string;
  };
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
  customSize,
  showTooltip = true,
}: CreateButtonProps) {
  // プリセットカラーの定義
  const colorClasses = {
    green: "bg-Green hover:bg-Green/85",
    yellow: "bg-DeepBlue hover:bg-DeepBlue/85",
    blue: "bg-light-Blue hover:bg-light-Blue/85",
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

  // カスタムサイズまたはデフォルトサイズを使用
  const paddingClass = customSize?.padding || sizeClasses[size];
  const iconSizeClass = customSize?.iconSize || iconSizeClasses[size];

  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${paddingClass} rounded-lg text-white transition-colors ${bgColorClass} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <PlusIcon className={iconSizeClass} />
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
