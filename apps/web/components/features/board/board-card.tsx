import { Board } from "@/src/types/board";
import { getTimeAgo } from "@/src/utils/dateUtils";

interface BoardCardProps {
  board: Board;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export default function BoardCard({ board, onSelect, onDelete, isDeleting }: BoardCardProps) {
  const updatedAt = new Date(board.updatedAt * 1000);
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
      <div onClick={onSelect} className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{board.name}</h3>
        {board.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{board.description}</p>
        )}
        <div className="text-xs text-gray-500">
          更新: {timeAgo}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={onSelect}
          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          開く
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {isDeleting ? "削除中..." : "削除"}
        </button>
      </div>
    </div>
  );
}

