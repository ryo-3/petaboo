"use client";

import BoardDetail from "@/components/features/board/board-detail";
import { useRouter } from "next/navigation";

interface BoardDetailClientProps {
  boardId: number;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
}

export default function BoardDetailClient({ 
  boardId, 
  initialBoardName, 
  initialBoardDescription 
}: BoardDetailClientProps) {
  const router = useRouter();

  return (
    <BoardDetail
      boardId={boardId}
      onBack={() => router.push("/")}
      onSelectMemo={(memo) => {
        // TODO: ハンドラー実装
        console.log("メモ選択:", memo);
      }}
      onSelectTask={(task) => {
        // TODO: ハンドラー実装
        console.log("タスク選択:", task);
      }}
      initialBoardName={initialBoardName}
      initialBoardDescription={initialBoardDescription}
      showBoardHeader={false}
    />
  );
}