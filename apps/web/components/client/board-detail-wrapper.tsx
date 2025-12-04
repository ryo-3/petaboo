import { useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BoardDetailScreenLegacy from "@/components/screens/board-detail-screen";
import BoardDetailScreenUnified from "@/components/screens/board-detail-screen-3panel";
import { useBoardWithItems } from "@/src/hooks/use-boards";
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
  onBoardSettings?: () => void;
}

const USE_UNIFIED_BOARD_DETAIL = false;

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
  onBoardSettings,
}: BoardDetailWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // サーバーサイドからのボード情報がある場合は優先使用
  const currentBoardId = boardId || boardFromSlug?.id;
  const currentBoardName = initialBoardName || boardFromSlug?.name;
  const currentBoardDescription =
    serverBoardDescription || boardFromSlug?.description;

  // URLパラメータからメモ/タスクのboardIndexを取得
  const memoIndexParam = searchParams.get("memo");
  const taskIndexParam = searchParams.get("task");

  // ボードアイテムを取得（URL復元用）
  // メモ/タスクパラメータがある場合のみフェッチ（不要なAPIコールを避ける）
  const needsUrlRestore = !teamMode && (memoIndexParam || taskIndexParam);
  const { data: boardWithItems } = useBoardWithItems(
    needsUrlRestore && currentBoardId ? currentBoardId : null,
  );

  // URL復元済みフラグ
  const hasRestoredFromUrl = useRef(false);

  // URLパラメータからメモ/タスクを復元（個人側のみ、初回のみ）
  useEffect(() => {
    // チーム側は別処理、復元済みならスキップ
    if (teamMode || hasRestoredFromUrl.current) return;
    // ボードアイテムがまだロードされていない場合はスキップ
    if (!boardWithItems?.items || boardWithItems.items.length === 0) return;
    // 既に何か選択されている場合はスキップ
    if (boardSelectedItem) return;

    // メモのboardIndexがURLにある場合
    if (memoIndexParam) {
      const memoIndex = parseInt(memoIndexParam, 10);
      const memoItem = boardWithItems.items.find(
        (item) =>
          item.itemType === "memo" && item.content.boardIndex === memoIndex,
      );
      if (memoItem) {
        handleBoardSelectMemo(memoItem.content as Memo);
        hasRestoredFromUrl.current = true;
        return;
      }
    }

    // タスクのboardIndexがURLにある場合
    if (taskIndexParam) {
      const taskIndex = parseInt(taskIndexParam, 10);
      const taskItem = boardWithItems.items.find(
        (item) =>
          item.itemType === "task" && item.content.boardIndex === taskIndex,
      );
      if (taskItem) {
        handleBoardSelectTask(taskItem.content as Task);
        hasRestoredFromUrl.current = true;
        return;
      }
    }
  }, [
    teamMode,
    memoIndexParam,
    taskIndexParam,
    boardWithItems,
    boardSelectedItem,
    handleBoardSelectMemo,
    handleBoardSelectTask,
  ]);

  // 個人側：ボード名と説明をヘッダーに通知
  useEffect(() => {
    if (!teamMode && currentBoardName) {
      window.dispatchEvent(
        new CustomEvent("team-board-name-change", {
          detail: {
            boardName: currentBoardName,
            boardDescription: currentBoardDescription || "",
            boardSlug: boardFromSlug?.slug,
          },
        }),
      );
    }

    return () => {
      if (!teamMode) {
        window.dispatchEvent(new CustomEvent("team-clear-board-name"));
      }
    };
  }, [
    currentBoardName,
    currentBoardDescription,
    teamMode,
    boardFromSlug?.slug,
  ]);

  return useMemo(() => {
    const BoardComponent = USE_UNIFIED_BOARD_DETAIL
      ? BoardDetailScreenUnified
      : BoardDetailScreenLegacy;

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
      <BoardComponent
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
        onSettings={onBoardSettings}
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
    onBoardSettings,
    router,
  ]);
}
