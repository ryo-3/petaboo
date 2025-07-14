"use client";

import { useState, useEffect } from "react";
import BoardList from "@/components/features/board/board-list";
import BoardDetail from "@/components/features/board/board-detail";
import DesktopUpper from "@/components/layout/desktop-upper";

export default function BoardScreen() {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ページタイトル設定（デフォルト）
  useEffect(() => {
    if (!selectedBoardId) {
      document.title = "ボード - メモ帳アプリ";
    }
    return () => {
      document.title = "メモ帳アプリ";
    };
  }, [selectedBoardId]);

  const handleCreateNew = () => {
    setShowCreateForm(true);
  };

  return (
    <div className="h-full">
      {selectedBoardId ? (
        <BoardDetail
          boardId={selectedBoardId}
          onBack={() => setSelectedBoardId(null)}
        />
      ) : (
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
            onBoardSelect={setSelectedBoardId}
            showCreateForm={showCreateForm}
            onCreateFormClose={() => setShowCreateForm(false)}
          />
        </div>
      )}
    </div>
  );
}