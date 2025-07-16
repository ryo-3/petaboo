import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useToggleBoardCompletion, useDeleteBoard, useRestoreDeletedBoard } from "@/src/hooks/use-boards";

interface BoardHeaderProps {
  boardId?: number;
  boardName: string;
  boardDescription?: string | null;
  boardCompleted?: boolean;
  isDeleted?: boolean;
  itemCount: number;
  onBack: () => void;
  onExport: () => void;
  isExportDisabled?: boolean;
}

export default function BoardHeader({ 
  boardId,
  boardName, 
  boardDescription, 
  boardCompleted = false,
  isDeleted = false,
  itemCount, 
  onBack, 
  onExport,
  isExportDisabled = false
}: BoardHeaderProps) {
  const toggleCompletion = useToggleBoardCompletion();
  const deleteBoard = useDeleteBoard();
  const restoreBoard = useRestoreDeletedBoard();

  const handleToggleCompletion = async () => {
    if (!boardId) return;
    try {
      await toggleCompletion.mutateAsync(boardId);
    } catch (error) {
      console.error("Failed to toggle board completion:", error);
    }
  };

  const handleDelete = async () => {
    if (!boardId) return;
    if (confirm("このボードを削除しますか？")) {
      try {
        await deleteBoard.mutateAsync(boardId);
        onBack(); // 削除後は一覧に戻る
      } catch (error) {
        console.error("Failed to delete board:", error);
      }
    }
  };

  const handleRestore = async () => {
    if (!boardId) return;
    try {
      await restoreBoard.mutateAsync(boardId);
      onBack(); // 復元後は一覧に戻る
    } catch (error) {
      console.error("Failed to restore board:", error);
    }
  };
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {boardName}
        </h1>
        {boardDescription && (
          <p className="text-gray-600 mt-1">{boardDescription}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-500">
          {itemCount} 個のアイテム
        </div>
        
        {/* 削除済みボードの場合は復元ボタンのみ */}
        {isDeleted ? (
          <button
            onClick={handleRestore}
            disabled={restoreBoard.isPending}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {restoreBoard.isPending ? "復元中..." : "復元"}
          </button>
        ) : (
          <>
            {/* 通常・完了ボードの場合 */}
            {boardId && (
              <>
                <button
                  onClick={handleToggleCompletion}
                  disabled={toggleCompletion.isPending}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    boardCompleted 
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                      : 'bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700'
                  }`}
                >
                  {toggleCompletion.isPending ? "処理中..." : boardCompleted ? "未完了に戻す" : "完了にする"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteBoard.isPending}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleteBoard.isPending ? "削除中..." : "削除"}
                </button>
              </>
            )}
            <button
              onClick={onExport}
              disabled={isExportDisabled}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isExportDisabled 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700'
              }`}
              title="テキストファイルとしてエクスポート"
            >
              📄 エクスポート
            </button>
          </>
        )}
        
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          一覧へ
        </button>
      </div>
    </div>
  );
}