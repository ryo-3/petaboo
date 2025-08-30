"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import BoardList from "@/components/features/board/board-list";
import DesktopUpper from "@/components/layout/desktop-upper";
import { useBoards, usePermanentDeleteBoard } from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import { useToast } from "@/src/contexts/toast-context";

export interface BoardScreenRef {
  triggerCreateNew: () => void;
}

interface BoardScreenProps {
  onBoardSelect?: (board: { id: number; slug: string }) => void;
  teamMode?: boolean;
  teamId?: number;
}

const BoardScreen = forwardRef<BoardScreenRef, BoardScreenProps>(
  ({ onBoardSelect, teamMode = false, teamId }, ref) => {
    const instanceId = Math.random().toString(36).substr(2, 9);
    console.log(
      `🎯 BoardScreen [${instanceId}] Props - teamMode: ${teamMode}, teamId: ${teamId}, !teamMode: ${!teamMode}`,
    );
    const router = useRouter();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [activeTab, setActiveTab] = useState<
      "normal" | "completed" | "deleted"
    >("normal");
    const { showToast } = useToast();

    // 各ステータスのボード数を取得（チーム/個人で切り替え）
    console.log(
      `🔧 Individual board queries [${instanceId}] - teamMode: ${teamMode}, enabled (should be false in team mode): ${!teamMode}`,
    );
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

      // 現在のURLと同じ場合はリロード
      const currentPath = window.location.pathname;
      if (currentPath === `/boards/${board.slug}`) {
        // 同じボードの場合はページをリロード
        window.location.reload();
      } else {
        // 違うボードの場合は通常の遷移
        router.push(`/boards/${board.slug}`);
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
        <div className="pt-3 pl-5 pr-2 flex flex-col h-full">
          <DesktopUpper
            currentMode="board"
            activeTab={activeTab}
            onTabChange={(tab) =>
              setActiveTab(tab as "normal" | "completed" | "deleted")
            }
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
