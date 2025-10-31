"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import BoardList from "@/components/features/board/board-list";
import DesktopUpper from "@/components/layout/desktop-upper";
import { useBoards, usePermanentDeleteBoard } from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import { useToast } from "@/src/contexts/toast-context";
import { useTeamContext } from "@/contexts/team-context";

export interface BoardScreenRef {
  triggerCreateNew: () => void;
}

interface BoardScreenProps {
  onBoardSelect?: (board: { id: number; slug: string }) => void;
}

const BoardScreen = forwardRef<BoardScreenRef, BoardScreenProps>(
  ({ onBoardSelect }, ref) => {
    const { isTeamMode: teamMode, teamId } = useTeamContext();
    const router = useRouter();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [activeTab, setActiveTab] = useState<
      "normal" | "completed" | "deleted"
    >("normal");
    const { showToast } = useToast();

    // 各ステータスのボード数を取得（チーム/個人で切り替え）
    const { data: individualNormalBoards } = useBoards("normal", !teamMode);
    const { data: individualCompletedBoards } = useBoards(
      "completed",
      !teamMode,
    );
    const { data: individualDeletedBoards } = useBoards("deleted", !teamMode);

    const { data: teamNormalBoards } = useTeamBoards(teamId || null, "normal");
    const { data: teamCompletedBoards } = useTeamBoards(
      teamId || null,
      "completed",
    );
    const { data: teamDeletedBoards } = useTeamBoards(
      teamId || null,
      "deleted",
    );

    // チームモードかどうかで使用するデータを決定
    const normalBoards = teamMode ? teamNormalBoards : individualNormalBoards;
    const completedBoards = teamMode
      ? teamCompletedBoards
      : individualCompletedBoards;
    const deletedBoards = teamMode
      ? teamDeletedBoards
      : individualDeletedBoards;

    // 完全削除フック
    const permanentDeleteBoard = usePermanentDeleteBoard();

    const handleCreateNew = () => {
      setShowCreateForm(true);
    };

    const handleBoardSelect = (board: { id: number; slug: string }) => {
      // 親コンポーネントの処理を呼び出し
      if (onBoardSelect) {
        // 親から onBoardSelect が渡されている場合（TeamDetailなど）は親に処理を委譲
        onBoardSelect(board);
      } else {
        // 親から onBoardSelect が渡されていない場合は独自処理（個人ボード画面など）
        const currentPath = window.location.pathname;
        if (currentPath === `/boards/${board.slug}`) {
          // 同じボードの場合はページをリロード
          window.location.reload();
        } else {
          // 違うボードの場合は通常の遷移
          router.push(`/boards/${board.slug}`);
        }
      }
    };

    const handlePermanentDeleteBoard = async (boardId: number) => {
      try {
        await permanentDeleteBoard.mutateAsync(boardId);
      } catch (error) {
        console.error("ボードの完全削除に失敗しました:", error);
        showToast(
          "ボードの完全削除に失敗しました。しばらく待ってから再試行してください。",
          "error",
        );
      }
    };

    useImperativeHandle(ref, () => ({
      triggerCreateNew: handleCreateNew,
    }));

    return (
      <div className="h-full">
        <div className="pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2 md:mr-3 flex flex-col h-full">
          <DesktopUpper
            currentMode="board"
            activeTab={activeTab}
            onTabChange={(tab) =>
              setActiveTab(tab as "normal" | "completed" | "deleted")
            }
            onCreateNew={handleCreateNew}
            viewMode="card"
            onViewModeChange={() => {}}
            columnCount={1}
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
            onPermanentDeleteBoard={handlePermanentDeleteBoard}
            teamMode={teamMode}
            teamId={teamId}
          />
        </div>
      </div>
    );
  },
);

BoardScreen.displayName = "BoardScreen";

export default BoardScreen;
