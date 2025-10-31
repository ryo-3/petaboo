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
  handleTeamList: () => void;
  handleTeamCreate: () => void;
  screenMode: string;
  initialBoardName?: string;
  currentBoard?: Board | null;
  showingBoardDetail: boolean;
}

export function MainClientDesktop({
  preferences,
  children,
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
  handleTeamList,
  handleTeamCreate,
  screenMode,
  initialBoardName,
  currentBoard,
  showingBoardDetail,
}: MainClientDesktopProps) {
  // 新規作成状態を判定
  const isCreatingMemo = screenMode === "create" && currentMode === "memo";
  const isCreatingTask = screenMode === "create" && currentMode === "task";

  return (
    <div className="flex flex-col h-screen w-full">
      {/* ヘッダー（設定で非表示可能、デスクトップのみ） */}
      {!preferences?.hideHeader && (
        <div className="hidden md:block">
          <Header />
        </div>
      )}

      {/* メインレイアウト */}
      <DesktopLayout
        hideHeader={preferences?.hideHeader}
        sidebarContent={
          // レスポンシブサイドバー（アイコンナビ）
          <Sidebar
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
            currentMode={currentMode}
            onModeChange={setCurrentMode}
            onSettings={handleSettings}
            onSearch={handleSearch}
            onDashboard={handleDashboard}
            onBoardDetail={handleBoardDetail}
            currentBoardName={initialBoardName || currentBoard?.name}
            showingBoardDetail={showingBoardDetail}
            onTeamList={handleTeamList}
            onTeamCreate={handleTeamCreate}
            isCreatingMemo={isCreatingMemo}
            isCreatingTask={isCreatingTask}
          />
        }
      >
        {children}
      </DesktopLayout>
    </div>
  );
}
