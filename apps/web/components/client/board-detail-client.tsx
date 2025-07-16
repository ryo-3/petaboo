"use client";

import BoardDetail from "@/components/features/board/board-detail";
import { useRouter } from "next/navigation";
import { useBoardWithItems } from "@/src/hooks/use-boards";

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
  const { data: boardWithItems } = useBoardWithItems(boardId);

  return (
    <BoardDetail
      boardId={boardId}
      onBack={() => router.push("/")}
      onSelectMemo={(memo) => {
        // TODO: ハンドラー実装
        // console.log("メモ選択:", memo);
      }}
      onSelectTask={(task) => {
        // TODO: ハンドラー実装
        // console.log("タスク選択:", task);
      }}
      initialBoardName={initialBoardName}
      initialBoardDescription={initialBoardDescription}
      boardCompleted={boardWithItems?.completed || false}
      isDeleted={false}
      showBoardHeader={false}
    />
  );
}