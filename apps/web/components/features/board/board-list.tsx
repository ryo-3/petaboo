import { useState, useEffect } from "react";
import { useBoards, useCreateBoard, useDeleteBoard } from "@/src/hooks/use-boards";
import BoardCard from "./board-card";
import BoardForm from "./board-form";
import { CreateBoardData } from "@/src/types/board";

interface BoardListProps {
  onBoardSelect?: (boardId: number) => void;
}

export default function BoardList({ onBoardSelect }: BoardListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const { data: boards, isLoading, error } = useBoards();
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();

  // ページタイトル設定
  useEffect(() => {
    document.title = "ボード一覧 - メモ帳アプリ";
  }, []);

  const handleCreateBoard = async (data: CreateBoardData) => {
    try {
      await createBoard.mutateAsync(data);
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    if (confirm("このボードを削除しますか？関連するアイテムの紐づけも解除されます。")) {
      try {
        await deleteBoard.mutateAsync(boardId);
      } catch (error) {
        console.error("Failed to delete board:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">ボードを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">ボードの読み込みに失敗しました</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ボード</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新しいボード
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6">
          <BoardForm
            onSubmit={handleCreateBoard}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createBoard.isPending}
          />
        </div>
      )}

      {boards && boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">まだボードがありません</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            最初のボードを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards?.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onSelect={() => onBoardSelect?.(board.id)}
              onDelete={() => handleDeleteBoard(board.id)}
              isDeleting={deleteBoard.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}