"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useBoards } from "@/src/hooks/use-boards";
import { useTeamContext } from "@/contexts/team-context";
import { useTeamBoards } from "@/src/hooks/use-team-boards";

export function BoardFilterContent() {
  const { sessionState, updateSessionState } = useViewSettings();
  const { isTeamMode, teamId } = useTeamContext();

  // チームモードに応じてボード取得
  const { data: personalBoards } = useBoards("normal");
  const { data: teamBoards } = useTeamBoards(teamId ?? 0);
  const boards = isTeamMode ? teamBoards : personalBoards;

  const handleModeChange = (mode: "include" | "exclude") => {
    updateSessionState({ boardFilterMode: mode });
  };

  const handleBoardToggle = (boardId: number) => {
    const newSelectedBoardIds = sessionState.selectedBoardIds.includes(boardId)
      ? sessionState.selectedBoardIds.filter((id) => id !== boardId)
      : [...sessionState.selectedBoardIds, boardId];

    updateSessionState({ selectedBoardIds: newSelectedBoardIds });
  };

  return (
    <div className="space-y-4">
      {/* モード選択 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          フィルターモード
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="boardFilterMode"
              value="include"
              checked={sessionState.boardFilterMode === "include"}
              onChange={() => handleModeChange("include")}
              className="w-4 h-4 text-blue-500"
            />
            <span className="text-sm">含む</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="boardFilterMode"
              value="exclude"
              checked={sessionState.boardFilterMode === "exclude"}
              onChange={() => handleModeChange("exclude")}
              className="w-4 h-4 text-blue-500"
            />
            <span className="text-sm">除外</span>
          </label>
        </div>
      </div>

      {/* ボード一覧 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">ボード選択</label>
        {!boards || boards.length === 0 ? (
          <p className="text-sm text-gray-500">ボードがありません</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {boards.map((board) => (
              <label
                key={board.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={sessionState.selectedBoardIds.includes(board.id)}
                  onChange={() => handleBoardToggle(board.id)}
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <span className="text-sm">{board.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
