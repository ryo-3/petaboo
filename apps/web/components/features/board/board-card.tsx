import { BoardWithStats } from "@/src/types/board";

interface BoardCardProps {
  board: BoardWithStats;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export default function BoardCard({ board, onSelect, onDelete, isDeleting }: BoardCardProps) {
  // ISO文字列またはUnix timestampを正しく処理
  const createdAt = typeof board.createdAt === 'string' 
    ? new Date(board.createdAt) 
    : new Date(board.createdAt * 1000);
  const updatedAt = typeof board.updatedAt === 'string' 
    ? new Date(board.updatedAt) 
    : new Date(board.updatedAt * 1000);
  
  // 日時を YYYY/MM/DD HH:MM 形式で表示
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const createdDateString = formatDateTime(createdAt);
  const updatedDateString = formatDateTime(updatedAt);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
      <div onClick={onSelect} className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{board.name}</h3>
        {board.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{board.description}</p>
        )}
        
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span className="text-xs">メモ</span>
            <span className="font-medium">{board.memoCount}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span className="text-xs">タスク</span>
            <span className="font-medium">{board.taskCount}</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 flex gap-4">
          <div>作成: {createdDateString}</div>
          {createdAt.getTime() !== updatedAt.getTime() && (
            <div>更新: {updatedDateString}</div>
          )}
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

