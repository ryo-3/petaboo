import { useState, useEffect } from "react";
import { useBoards } from "@/src/hooks/use-boards";
import { Board } from "@/src/types/board";

interface BoardSelectorProps {
  selectedBoardId?: number | null;
  onBoardChange: (boardId: number | null) => void;
  placeholder?: string;
  className?: string;
}

export default function BoardSelector({
  selectedBoardId,
  onBoardChange,
  placeholder = "ボードを選択",
  className = "",
}: BoardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: boards = [], isLoading } = useBoards();

  const selectedBoard = boards.find((board) => board.id === selectedBoardId);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-board-selector]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const handleBoardSelect = (board: Board | null) => {
    onBoardChange(board?.id || null);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500">
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} data-board-selector>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className={selectedBoard ? "text-gray-900" : "text-gray-500"}>
          {selectedBoard ? selectedBoard.name : placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* なし選択 */}
          <button
            type="button"
            onClick={() => handleBoardSelect(null)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
              !selectedBoardId ? "bg-blue-50 text-blue-600" : "text-gray-700"
            }`}
          >
            なし
          </button>

          {/* ボード一覧 */}
          {boards.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              ボードがありません
            </div>
          ) : (
            boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => handleBoardSelect(board)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  selectedBoardId === board.id ? "bg-blue-50 text-blue-600" : "text-gray-700"
                }`}
              >
                {board.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}