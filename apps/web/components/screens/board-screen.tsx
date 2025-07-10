"use client";

import { useState, useEffect } from "react";
import BoardList from "@/components/features/board/board-list";
import BoardDetail from "@/components/features/board/board-detail";

export default function BoardScreen() {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  // ページタイトル設定（デフォルト）
  useEffect(() => {
    if (!selectedBoardId) {
      document.title = "ボード - メモ帳アプリ";
    }
    return () => {
      document.title = "メモ帳アプリ";
    };
  }, [selectedBoardId]);

  return (
    <div className="h-full">
      {selectedBoardId ? (
        <BoardDetail
          boardId={selectedBoardId}
          onBack={() => setSelectedBoardId(null)}
        />
      ) : (
        <BoardList onBoardSelect={setSelectedBoardId} />
      )}
    </div>
  );
}