import { useBoards, useCreateBoard } from "@/src/hooks/use-boards";
import { CreateBoardData } from "@/src/types/board";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BoardCard from "./board-card";
import BoardForm from "./board-form";

interface BoardListProps {
  onBoardSelect?: (board: { id: number; slug: string }) => void;
  showCreateForm?: boolean;
  onCreateFormClose?: () => void;
  activeTab?: "normal" | "completed" | "deleted";
  onPermanentDeleteBoard?: (boardId: number) => void;
}

export default function BoardList({
  onBoardSelect,
  showCreateForm: externalShowCreateForm,
  onCreateFormClose,
  activeTab = "normal",
  onPermanentDeleteBoard,
}: BoardListProps) {
  const [internalShowCreateForm, setInternalShowCreateForm] = useState(false);
  const showCreateForm = externalShowCreateForm ?? internalShowCreateForm;
  const pathname = usePathname();

  const { data: boards, isLoading, error } = useBoards(activeTab);
  const createBoard = useCreateBoard();

  // 現在のURLから選択されているボードのslugを取得
  const currentBoardSlug = pathname.startsWith("/boards/")
    ? pathname.split("/")[2]
    : null;

  // ページタイトル設定
  useEffect(() => {
    document.title = "ボード一覧 - メモ帳アプリ";
  }, []);

  const handleCreateBoard = async (data: CreateBoardData) => {
    try {
      await createBoard.mutateAsync(data);
      if (onCreateFormClose) {
        onCreateFormClose();
      } else {
        setInternalShowCreateForm(false);
      }
    } catch {
      // エラーはミューテーションのエラーハンドリングで処理される
    }
  };

  const handleCloseCreateForm = () => {
    if (onCreateFormClose) {
      onCreateFormClose();
    } else {
      setInternalShowCreateForm(false);
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

  if (activeTab === "completed") {
    if (boards && boards.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">完了したボードはありません</div>
          <div className="text-sm text-gray-400">
            ボードを完了にするには、通常タブで完了ボタンを押してください
          </div>
        </div>
      );
    }
  }

  if (activeTab === "deleted") {
    if (boards && boards.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">削除済みボードはありません</div>
          <div className="text-sm text-gray-400">
            削除されたボードがここに表示されます
          </div>
        </div>
      );
    }
  }

  return (
    <div className="">
      {showCreateForm && activeTab === "normal" && (
        <div className="mb-6">
          <BoardForm
            onSubmit={handleCreateBoard}
            onCancel={handleCloseCreateForm}
            isLoading={createBoard.isPending}
          />
        </div>
      )}

      {boards && boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {activeTab === "normal"
              ? "まだボードがありません"
              : activeTab === "completed"
                ? "完了したボードはありません"
                : "削除済みボードはありません"}
          </div>
          <div className="text-sm text-gray-400">
            {activeTab === "normal"
              ? "右上の + ボタンから新しいボードを作成できます"
              : activeTab === "completed"
                ? "ボードを完了にするには、通常タブで完了ボタンを押してください"
                : "削除されたボードがここに表示されます"}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards
            ?.sort((a, b) => {
              // 選択中のボードを最初に表示
              if (currentBoardSlug === a.slug) return -1;
              if (currentBoardSlug === b.slug) return 1;
              return 0; // その他は元の順序を保持
            })
            .map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onSelect={() => onBoardSelect?.(board)}
                mode={activeTab}
                onPermanentDelete={
                  activeTab === "deleted" ? onPermanentDeleteBoard : undefined
                }
                isSelected={currentBoardSlug === board.slug}
              />
            ))}
        </div>
      )}
    </div>
  );
}
