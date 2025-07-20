"use client";

import BoardDetailScreen from "@/components/screens/board-detail-screen";
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
    <BoardDetailScreen
      boardId={boardId}
      onBack={() => router.push("/")}
      onSelectMemo={() => {
        // TODO: ハンドラー実装
        // console.log("メモ選択:");
      }}
      onSelectTask={() => {
        // TODO: ハンドラー実装
        // console.log("タスク選択:");
      }}
      initialBoardName={initialBoardName}
      initialBoardDescription={initialBoardDescription}
      boardCompleted={boardWithItems?.completed || false}
      isDeleted={false}
      showBoardHeader={false}
    />
  );
}