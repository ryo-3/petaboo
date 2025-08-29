"use client";

interface ClosePanelButtonProps {
  onClose: () => void;
  className?: string;
}

/**
 * 右パネル用の閉じるボタン
 * memo-screen.tsx, task-screen.tsx で共通使用
 */
function ClosePanelButton({ onClose, className }: ClosePanelButtonProps) {
  return (
    <button
      onClick={onClose}
      className={`absolute -left-3 top-[40px] transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors z-10 ${className || ""}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}

export default ClosePanelButton;
