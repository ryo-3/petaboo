"use client";

import {
  useUpdateTeamBoard,
  useDeleteTeamBoard,
  useToggleTeamBoardCompletion,
} from "@/src/hooks/use-team-boards";
import SharedBoardSettings from "@/components/features/board/shared-board-settings";

interface TeamBoardSettingsProps {
  teamId: number;
  teamCustomUrl: string;
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
}

export default function TeamBoardSettings({
  teamId,
  teamCustomUrl,
  boardId,
  boardSlug,
  initialBoardName,
  initialBoardDescription,
  initialBoardCompleted,
}: TeamBoardSettingsProps) {
  const updateTeamBoard = useUpdateTeamBoard(teamId);
  const deleteTeamBoard = useDeleteTeamBoard(teamId);
  const toggleCompletion = useToggleTeamBoardCompletion(teamId);

  return (
    <SharedBoardSettings
      boardId={boardId}
      boardSlug={boardSlug}
      initialBoardName={initialBoardName}
      initialBoardDescription={initialBoardDescription}
      initialBoardCompleted={initialBoardCompleted}
      isTeamMode={true}
      teamCustomUrl={teamCustomUrl}
      updateMutation={updateTeamBoard}
      toggleCompletionMutation={toggleCompletion}
      deleteMutation={deleteTeamBoard}
    />
  );
}
