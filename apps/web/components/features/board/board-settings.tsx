"use client";

import {
  useToggleBoardCompletion,
  useDeleteBoard,
  useUpdateBoard,
} from "@/src/hooks/use-boards";
import SharedBoardSettings from "./shared-board-settings";

interface BoardSettingsProps {
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
}

export default function BoardSettings({
  boardId,
  boardSlug,
  initialBoardName,
  initialBoardDescription,
  initialBoardCompleted,
}: BoardSettingsProps) {
  const toggleCompletion = useToggleBoardCompletion();
  const deleteBoard = useDeleteBoard();
  const updateBoard = useUpdateBoard();

  return (
    <SharedBoardSettings
      boardId={boardId}
      boardSlug={boardSlug}
      initialBoardName={initialBoardName}
      initialBoardDescription={initialBoardDescription}
      initialBoardCompleted={initialBoardCompleted}
      isTeamMode={false}
      updateMutation={updateBoard}
      toggleCompletionMutation={toggleCompletion}
      deleteMutation={deleteBoard}
    />
  );
}
