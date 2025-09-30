import BoardScreen, { BoardScreenRef } from "@/components/screens/board-screen";
import CreateScreen from "@/components/screens/create-screen";
import MemoScreen from "@/components/screens/memo-screen";
import SearchScreen from "@/components/screens/search-screen";
import SettingsScreen from "@/components/screens/settings-screen";
import TaskScreen from "@/components/screens/task-screen";
import WelcomeScreen from "@/components/screens/welcome-screen";
import { TeamWelcome } from "@/components/features/team/team-welcome";
import { TeamCreate } from "@/components/features/team/team-create";
import { BoardDetailWrapper } from "./board-detail-wrapper";
import type { Board } from "@/src/types/board";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import { RefObject } from "react";
import { useNavigation } from "@/contexts/navigation-context";
import { useUnifiedItemOperations } from "@/src/hooks/use-unified-item-operations";

interface MainContentAreaProps {
  screenMode: string;
  pathname: string;
  currentMode: "memo" | "task" | "board";

  // 選択状態
  selectedMemo: Memo | null;
  selectedDeletedMemo: DeletedMemo | null;
  selectedTask: Task | null;
  selectedDeletedTask: DeletedTask | null;
  boardSelectedItem:
    | { type: "memo"; item: Memo | DeletedMemo }
    | { type: "task"; item: Task | DeletedTask }
    | null;

  // セッター
  setSelectedMemo: (memo: Memo | null) => void;
  setSelectedDeletedMemo: (memo: DeletedMemo | null) => void;
  setSelectedTask: (task: Task | null) => void;
  setSelectedDeletedTask: (task: DeletedTask | null) => void;
  setCurrentMode: (mode: "memo" | "task" | "board") => void;

  // ボード関連
  boardId?: number;
  boardFromSlug: Board | null | undefined;
  initialBoardName?: string;
  serverBoardDescription?: string | null;
  serverBoardTitle?: string;
  showBoardHeader: boolean;
  showingBoardDetail: boolean;
  boardScreenRef: RefObject<BoardScreenRef | null>;

  // チーム機能
  teamMode?: boolean;
  teamId?: number;
  handleTeamCreate?: () => void;
  handleTeamCreated?: () => void;

  // ハンドラー
  handleSelectMemo: (memo: Memo | null) => void;
  handleSelectDeletedMemo: (memo: DeletedMemo | null) => void;
  handleSelectTask: (task: Task | null) => void;
  handleSelectDeletedTask: (task: DeletedTask | null) => void;
  handleClose: () => void;
  handleShowList: (mode: "memo" | "task" | "board") => void;
  handleBoardSelectMemo: (memo: Memo | null) => void;
  handleBoardSelectTask: (task: Task | DeletedTask | null) => void;
  handleBoardClearSelection: () => void;
}

export function MainContentArea({
  screenMode,
  pathname,
  currentMode,
  selectedMemo,
  selectedDeletedMemo,
  selectedTask,
  selectedDeletedTask,
  boardSelectedItem,
  setSelectedMemo,
  setSelectedDeletedMemo,
  setSelectedTask,
  setSelectedDeletedTask,
  setCurrentMode,
  boardId,
  boardFromSlug,
  initialBoardName,
  serverBoardDescription,
  serverBoardTitle,
  showBoardHeader,
  showingBoardDetail,
  boardScreenRef,
  handleSelectMemo,
  handleSelectDeletedMemo,
  handleSelectTask,
  handleSelectDeletedTask,
  handleClose,
  handleShowList,
  handleBoardSelectMemo,
  handleBoardSelectTask,
  handleBoardClearSelection,
  teamMode = false,
  teamId,
  handleTeamCreate,
  handleTeamCreated,
}: MainContentAreaProps) {
  // NavigationContextから統一された状態を取得
  const { showTeamList, showTeamCreate } = useNavigation();

  // 🎯 統一フック（個人用）- 最上位で1つだけ作成
  const personalMemoOperations = useUnifiedItemOperations({
    itemType: "memo",
    context: "personal",
  });

  const personalTaskOperations = useUnifiedItemOperations({
    itemType: "task",
    context: "personal",
  });

  return (
    <>
      {/* ホーム画面 */}
      {screenMode === "home" && !showTeamList && !showTeamCreate && (
        <WelcomeScreen teamMode={teamMode} />
      )}

      {/* チーム一覧画面 */}
      {showTeamList && <TeamWelcome onTeamCreate={handleTeamCreate} />}

      {/* チーム作成画面 */}
      {showTeamCreate && <TeamCreate onTeamCreated={handleTeamCreated} />}

      {/* メモ関連画面（一覧・表示・編集） */}
      {screenMode === "memo" && (
        <MemoScreen
          selectedMemo={selectedMemo}
          selectedDeletedMemo={selectedDeletedMemo}
          onSelectMemo={handleSelectMemo}
          onSelectDeletedMemo={handleSelectDeletedMemo}
          onClose={handleClose}
          onDeselectAndStayOnMemoList={() => {
            setSelectedMemo(null);
            setSelectedDeletedMemo(null);
          }}
          teamMode={teamMode}
          teamId={teamId}
          // 統一フックを渡す
          unifiedOperations={personalMemoOperations}
        />
      )}

      {/* タスク関連画面（一覧・表示・編集） */}
      {screenMode === "task" && (
        <TaskScreen
          selectedTask={selectedTask}
          selectedDeletedTask={selectedDeletedTask}
          onSelectTask={handleSelectTask}
          onSelectDeletedTask={handleSelectDeletedTask}
          onClose={handleClose}
          onClearSelection={() => {
            setSelectedTask(null);
            setSelectedDeletedTask(null);
          }}
          // 統一フックを渡す
          unifiedOperations={personalTaskOperations}
        />
      )}

      {/* 新規作成画面（メモ・タスク・ボード統合） */}
      {screenMode === "create" && (
        <CreateScreen
          initialMode={currentMode}
          onClose={handleClose}
          onModeChange={setCurrentMode}
          onShowMemoList={() => handleShowList("memo")}
          onShowTaskList={() => handleShowList("task")}
          onShowBoardList={() => handleShowList("board")}
          unifiedOperations={{
            memoOperations: personalMemoOperations,
            taskOperations: personalTaskOperations,
          }}
        />
      )}

      {/* 検索画面 */}
      {screenMode === "search" && (
        <SearchScreen
          onSelectMemo={handleSelectMemo}
          onSelectTask={handleSelectTask}
          onSelectDeletedMemo={handleSelectDeletedMemo}
          onSelectDeletedTask={handleSelectDeletedTask}
        />
      )}

      {/* 設定画面 */}
      {screenMode === "settings" && <SettingsScreen />}

      {/* ボード画面 */}
      {screenMode === "board" &&
        (pathname.startsWith("/boards/") || boardId || initialBoardName ? (
          showingBoardDetail ? (
            <BoardDetailWrapper
              boardId={boardId}
              boardFromSlug={boardFromSlug}
              initialBoardName={initialBoardName}
              serverBoardDescription={serverBoardDescription}
              serverBoardTitle={serverBoardTitle}
              showBoardHeader={showBoardHeader}
              boardSelectedItem={boardSelectedItem}
              handleBoardSelectMemo={handleBoardSelectMemo}
              handleBoardSelectTask={handleBoardSelectTask}
              handleBoardClearSelection={handleBoardClearSelection}
            />
          ) : (
            <BoardScreen
              ref={boardScreenRef as React.RefObject<BoardScreenRef>}
              teamMode={teamMode}
              teamId={teamId}
            />
          )
        ) : (
          <BoardScreen
            ref={boardScreenRef as React.RefObject<BoardScreenRef>}
          />
        ))}
    </>
  );
}
