import DeletedMemoList from "@/components/features/memo/deleted-memo-list";
import Sidebar from "@/components/layout/sidebar";
import type { Board } from "@/src/types/board";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";

interface MainClientMobileProps {
  showDeleted: boolean;
  handleBackToMemos: () => void;
  handleSelectDeletedMemo: (memo: DeletedMemo | null) => void;
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
  handleDashboard: () => void;
  handleBoardDetail: () => void;
  handleTeamList: () => void;
  handleTeamCreate: () => void;
  screenMode: string;
  initialBoardName?: string;
  currentBoard?: Board | null;
  showingBoardDetail: boolean;
}

export function MainClientMobile({
  showDeleted,
  handleBackToMemos,
  handleSelectDeletedMemo,
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
  handleDashboard,
  handleBoardDetail,
  handleTeamList,
  handleTeamCreate,
  screenMode,
  initialBoardName,
  currentBoard,
  showingBoardDetail,
}: MainClientMobileProps) {
  // 新規作成状態を判定
  const isCreatingMemo = screenMode === "create" && currentMode === "memo";
  const isCreatingTask = screenMode === "create" && currentMode === "task";

  return (
    <div className="h-screen w-full md:hidden">
      {showDeleted ? (
        // 削除済みメモ一覧表示
        <DeletedMemoList
          onBackToMemos={handleBackToMemos}
          onSelectDeletedMemo={handleSelectDeletedMemo}
        />
      ) : (
        // 通常のサイドバー表示（レスポンシブ対応）
        <Sidebar
          onSelectMemo={handleSelectMemo}
          onSelectTask={handleSelectTask}
          onEditTask={handleEditTask}
          onShowFullList={() => handleShowList("memo")}
          onHome={handleHome}
          onEditMemo={handleEditMemo}
          onDeleteMemo={handleDeleteMemo}
          selectedMemoId={selectedMemo?.id}
          selectedTaskId={selectedTask?.id}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          onSettings={handleSettings}
          onDashboard={handleDashboard}
          onBoardDetail={handleBoardDetail}
          currentBoardName={initialBoardName || currentBoard?.name}
          showingBoardDetail={showingBoardDetail}
          onTeamList={handleTeamList}
          onTeamCreate={handleTeamCreate}
          isCreatingMemo={isCreatingMemo}
          isCreatingTask={isCreatingTask}
        />
      )}
    </div>
  );
}
