"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import BoardList from "@/components/features/board/board-list";
import DesktopUpper from "@/components/layout/desktop-upper";

export interface BoardScreenRef {
  triggerCreateNew: () => void;
}

interface BoardScreenProps {
  onBoardSelect?: (board: { id: number; slug: string }) => void;
}

const BoardScreen = forwardRef<BoardScreenRef, BoardScreenProps>(({ onBoardSelect }, ref) => {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // ページタイトル設定（デフォルト）
  useEffect(() => {
    document.title = "ボード一覧 - メモ帳アプリ";
    return () => {
      document.title = "メモ帳アプリ";
    };
  }, []);

  const handleCreateNew = () => {
    setShowCreateForm(true);
  };

  const handleBoardSelect = (board: { id: number; slug: string }) => {
    // 親コンポーネントの処理を呼び出し
    onBoardSelect?.(board);
    // 遷移前にローディング状態を示す
    router.push(`/boards/${board.slug}`);
  };

  useImperativeHandle(ref, () => ({
    triggerCreateNew: handleCreateNew,
  }));

  return (
    <div className="h-full">
      <div className="pt-6 pl-6 pr-2 flex flex-col h-full">
        <DesktopUpper
          currentMode="board"
          activeTab={showDeleted ? "deleted" : "normal"}
          onTabChange={(tab) => setShowDeleted(tab === "deleted")}
          onCreateNew={handleCreateNew}
          viewMode="card"
          onViewModeChange={() => {}}
          columnCount={3}
          onColumnCountChange={() => {}}
          rightPanelMode="hidden"
          normalCount={0}
          deletedCount={0}
        />
        
        <BoardList 
          onBoardSelect={handleBoardSelect}
          showCreateForm={showCreateForm}
          onCreateFormClose={() => setShowCreateForm(false)}
          showDeleted={showDeleted}
        />
      </div>
    </div>
  );
});

BoardScreen.displayName = "BoardScreen";

export default BoardScreen;