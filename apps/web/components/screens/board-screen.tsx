"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import BoardList from "@/components/features/board/board-list";
import DesktopUpper from "@/components/layout/desktop-upper";
import { useBoards } from "@/src/hooks/use-boards";

export interface BoardScreenRef {
  triggerCreateNew: () => void;
}

interface BoardScreenProps {
  onBoardSelect?: (board: { id: number; slug: string }) => void;
}

const BoardScreen = forwardRef<BoardScreenRef, BoardScreenProps>(({ onBoardSelect }, ref) => {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"normal" | "completed" | "deleted">("normal");
  
  // 各ステータスのボード数を取得
  const { data: normalBoards } = useBoards("normal");
  const { data: completedBoards } = useBoards("completed");
  const { data: deletedBoards } = useBoards("deleted");

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
      <div className="pt-3 pl-5 pr-2 flex flex-col h-full">
        <DesktopUpper
          currentMode="board"
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "normal" | "completed" | "deleted")}
          onCreateNew={handleCreateNew}
          viewMode="card"
          onViewModeChange={() => {}}
          columnCount={3}
          onColumnCountChange={() => {}}
          rightPanelMode="hidden"
          normalCount={normalBoards?.length || 0}
          completedCount={completedBoards?.length || 0}
          deletedCount={deletedBoards?.length || 0}
        />
        
        <BoardList 
          onBoardSelect={handleBoardSelect}
          showCreateForm={showCreateForm}
          onCreateFormClose={() => setShowCreateForm(false)}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
});

BoardScreen.displayName = "BoardScreen";

export default BoardScreen;