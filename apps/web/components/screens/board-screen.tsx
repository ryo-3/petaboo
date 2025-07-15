"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import BoardList from "@/components/features/board/board-list";
import DesktopUpper from "@/components/layout/desktop-upper";

export interface BoardScreenRef {
  triggerCreateNew: () => void;
}

const BoardScreen = forwardRef<BoardScreenRef>((props, ref) => {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);

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
          activeTab="normal"
          onTabChange={() => {}}
          onCreateNew={handleCreateNew}
          viewMode="card"
          onViewModeChange={() => {}}
          columnCount={3}
          onColumnCountChange={() => {}}
          rightPanelMode="hidden"
          normalCount={0}
        />
        
        <BoardList 
          onBoardSelect={handleBoardSelect}
          showCreateForm={showCreateForm}
          onCreateFormClose={() => setShowCreateForm(false)}
        />
      </div>
    </div>
  );
});

BoardScreen.displayName = "BoardScreen";

export default BoardScreen;