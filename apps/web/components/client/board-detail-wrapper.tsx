import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import BoardDetailScreen from "@/components/screens/board-detail-screen";
import type { Board } from "@/src/types/board";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

interface BoardDetailWrapperProps {
  boardId?: number;
  boardFromSlug: Board | null | undefined;
  initialBoardName?: string;
  serverBoardDescription?: string | null;
  serverBoardTitle?: string;
  showBoardHeader: boolean;
  boardSelectedItem:
    | { type: "memo"; item: Memo | DeletedMemo }
    | { type: "task"; item: Task | DeletedTask }
    | null;
  handleBoardSelectMemo: (memo: Memo | null) => void;
  handleBoardSelectTask: (task: Task | DeletedTask | null) => void;
  handleBoardClearSelection: () => void;
  teamMode?: boolean;
  teamId?: number | null;
}

export function BoardDetailWrapper({
  boardId,
  boardFromSlug,
  initialBoardName,
  serverBoardDescription,
  serverBoardTitle,
  showBoardHeader,
  boardSelectedItem,
  handleBoardSelectMemo,
  handleBoardSelectTask,
  handleBoardClearSelection,
  teamMode = false,
  teamId = null,
}: BoardDetailWrapperProps) {
  const router = useRouter();

  // サーバーサイドからのボード情報がある場合は優先使用
  const currentBoardId = boardId || boardFromSlug?.id;
  const currentBoardName = initialBoardName || boardFromSlug?.name;
  const currentBoardDescription =
    serverBoardDescription || boardFromSlug?.description;

  // 個人側：ボード名をヘッダーに通知
  useEffect(() => {
    if (!teamMode && currentBoardName) {
      window.dispatchEvent(
        new CustomEvent("team-board-name-change", {
          detail: { boardName: currentBoardName },
        }),
      );
    }

    return () => {
      if (!teamMode) {
        window.dispatchEvent(new CustomEvent("team-clear-board-name"));
      }
    };
  }, [currentBoardName, teamMode]);

  return useMemo(() => {
    // ボードIDがない場合はエラー
    if (!currentBoardId) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ボードが見つかりません
            </h1>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ボード一覧に戻る
            </button>
          </div>
        </div>
      );
    }

    // シンプルにBoardDetailを表示（メモ・タスク一覧と同じパターン）
    return (
      <BoardDetailScreen
        boardId={currentBoardId}
        onBack={() => router.push("/")}
        selectedMemo={
          boardSelectedItem?.type === "memo" ? boardSelectedItem.item : null
        }
        selectedTask={
          boardSelectedItem?.type === "task" ? boardSelectedItem.item : null
        }
        onSelectMemo={handleBoardSelectMemo}
        onSelectTask={handleBoardSelectTask}
        onClearSelection={handleBoardClearSelection}
        initialBoardName={currentBoardName}
        initialBoardDescription={currentBoardDescription}
        showBoardHeader={showBoardHeader}
        serverInitialTitle={serverBoardTitle}
      />
    );
  }, [
    boardId,
    boardFromSlug?.id,
    boardFromSlug?.name,
    boardFromSlug?.description,
    initialBoardName,
    serverBoardDescription,
    serverBoardTitle,
    showBoardHeader,
    boardSelectedItem,
    handleBoardSelectMemo,
    handleBoardSelectTask,
    handleBoardClearSelection,
    teamMode,
    teamId,
    router,
  ]);
}
