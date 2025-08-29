import { X } from "lucide-react";

interface CloseButtonProps {
  onClick: () => void;
  size?: number;
  className?: string;
}

export default function CloseButton({
  onClick,
  size = 22,
  className = "",
}: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
    >
      <X size={size} />
    </button>
  );
}
