interface PanelBackButtonProps {
  onClick?: () => void;
  className?: string;
}

export function PanelBackButton({
  onClick,
  className = "",
}: PanelBackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center size-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors ${className}`}
    >
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
