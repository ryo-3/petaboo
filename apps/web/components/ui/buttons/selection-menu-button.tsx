import React from 'react';
import { ButtonContainer } from "@/components/ui/layout/button-container";

interface SelectionMenuButtonProps {
  count: number;
  onMenuClick: () => void;
  isVisible: boolean;
}

/**
 * 選択したアイテム数を表示し、メニューを開くボタン
 * 通常タブでアイテムが選択された時に左下に表示される
 */
export default function SelectionMenuButton({
  count,
  onMenuClick,
  isVisible
}: SelectionMenuButtonProps) {
  return (
    <ButtonContainer show={isVisible} position="bottom-left">
      <div className="relative">
        <button
          onClick={onMenuClick}
          className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded-full shadow-lg transition-colors flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
        </button>
        {/* バッジ */}
        <div className="absolute -top-2 -right-2 bg-Green text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
          {count}
        </div>
      </div>
    </ButtonContainer>
  );
}