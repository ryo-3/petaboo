import ArrowLeftIcon from "@/components/icons/arrow-left-icon";

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

export function BackButton({ onClick, className }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-1 text-gray-600 hover:text-gray-800 transition-colors rounded-md hover:bg-gray-100 ${className || ""}`}
    >
      <ArrowLeftIcon className="w-5 h-5" />
    </button>
  );
}
