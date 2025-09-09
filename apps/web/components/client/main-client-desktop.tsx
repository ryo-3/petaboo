import { ReactNode } from "react";
import DesktopLayout from "@/components/layout/desktop-layout";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import type { Board } from "@/src/types/board";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";
import type { UserPreferences } from "@/src/hooks/use-user-preferences";

interface MainClientDesktopProps {
  preferences?: UserPreferences | null;
  children: ReactNode;
  handleNewMemo: () => void;
  handleNewTask: () => void;
  handleSelectMemo: (memo: Memo | null) => void;
  handleSelectTask: (task: Task | null) => void;
  handleEditTask: (task?: Task) => void;
  handleShowList: (mode: "memo" | "task" | "board") => void;
  handleHome: () => void;
  handleEditMemo: (memo?: Memo) => void;
  handleDeleteMemo: (nextMemo: Memo) => void;
  selectedMemo: Memo | null;
  selectedTask: Task | null;
  currentMode: "memo" | "task" | "board";
  setCurrentMode: (mode: "memo" | "task" | "board") => void;
  handleSettings: () => void;
  handleSearch: () => void;
  handleDashboard: () => void;
  handleBoardDetail: () => void;
  handleNewBoard: () => void;
  handleTeamList: () => void;
  screenMode: string;
  initialBoardName?: string;
  currentBoard?: Board | null;
  showingBoardDetail: boolean;
  showTeamList: boolean;
}

export function MainClientDesktop({
  preferences,
  children,
  handleNewMemo,
  handleNewTask,
  handleSelectMemo,
  handleSelectTask,
  handleEditTask,
  handleShowList,
  handleHome,
  handleEditMemo,
  handleDeleteMemo,
  selectedMemo,
  selectedTask,
  currentMode,
  setCurrentMode,
  handleSettings,
  handleSearch,
  handleDashboard,
  handleBoardDetail,
  handleNewBoard,
  handleTeamList,
  screenMode,
  initialBoardName,
  currentBoard,
  showingBoardDetail,
  showTeamList,
}: MainClientDesktopProps) {
  return (
    <div className="hidden md:flex flex-col h-screen w-full">
      {/* ヘッダー（設定で非表示可能） */}
      {!preferences?.hideHeader && <Header />}

      {/* メインレイアウト */}
      <DesktopLayout
        hideHeader={preferences?.hideHeader}
        sidebarContent={
          // コンパクトサイドバー（アイコンナビ）
          <Sidebar
            onNewMemo={handleNewMemo}
            onNewTask={handleNewTask}
            onSelectMemo={handleSelectMemo}
            onSelectTask={handleSelectTask}
            onEditTask={handleEditTask}
            onShowFullList={() => handleShowList("memo")}
            onShowTaskList={() => handleShowList("task")}
            onHome={handleHome}
            onEditMemo={handleEditMemo}
            onDeleteMemo={handleDeleteMemo}
            selectedMemoId={selectedMemo?.id}
            selectedTaskId={selectedTask?.id}
            isCompact={true} // デスクトップは常にコンパクト
            currentMode={currentMode}
            onModeChange={setCurrentMode}
            onSettings={handleSettings}
            onSearch={handleSearch}
            onDashboard={handleDashboard}
            onBoardDetail={handleBoardDetail}
            onNewBoard={handleNewBoard}
            isBoardActive={
              screenMode === "board" ||
              (screenMode === "create" && currentMode === "board")
            }
            currentBoardName={initialBoardName || currentBoard?.name}
            showingBoardDetail={showingBoardDetail}
            onTeamList={handleTeamList}
            showTeamList={showTeamList}
            screenMode={screenMode}
          />
        }
      >
        {children}
      </DesktopLayout>
    </div>
  );
}
