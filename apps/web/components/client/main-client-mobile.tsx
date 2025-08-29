import DeletedMemoList from "@/components/features/memo/deleted-memo-list";
import Sidebar from "@/components/layout/sidebar";
import type { Board } from "@/src/types/board";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";

interface MainClientMobileProps {
  showDeleted: boolean;
  handleBackToMemos: () => void;
  handleSelectDeletedMemo: (memo: DeletedMemo | null) => void;
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
  handleDashboard: () => void;
  handleBoardDetail: () => void;
  handleNewBoard: () => void;
  screenMode: string;
  initialBoardName?: string;
  currentBoard?: Board | null;
  showingBoardDetail: boolean;
}

export function MainClientMobile({
  showDeleted,
  handleBackToMemos,
  handleSelectDeletedMemo,
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
  handleDashboard,
  handleBoardDetail,
  handleNewBoard,
  screenMode,
  initialBoardName,
  currentBoard,
  showingBoardDetail,
}: MainClientMobileProps) {
  return (
    <div className="h-screen w-full md:hidden">
      {showDeleted ? (
        // 削除済みメモ一覧表示
        <DeletedMemoList
          onBackToMemos={handleBackToMemos}
          onSelectDeletedMemo={handleSelectDeletedMemo}
        />
      ) : (
        // 通常のサイドバー表示（フルサイズ）
        <Sidebar
          onNewMemo={handleNewMemo}
          onNewTask={handleNewTask}
          onSelectMemo={handleSelectMemo}
          onSelectTask={handleSelectTask}
          onEditTask={handleEditTask}
          onShowFullList={() => handleShowList("memo")}
          onHome={handleHome}
          onEditMemo={handleEditMemo}
          onDeleteMemo={handleDeleteMemo}
          selectedMemoId={selectedMemo?.id}
          selectedTaskId={selectedTask?.id}
          isCompact={false} // モバイルは常にフルサイズ
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          onSettings={handleSettings}
          onDashboard={handleDashboard}
          onBoardDetail={handleBoardDetail}
          onNewBoard={handleNewBoard}
          isBoardActive={
            screenMode === "board" ||
            (screenMode === "create" && currentMode === "board")
          }
          currentBoardName={initialBoardName || currentBoard?.name}
          showingBoardDetail={showingBoardDetail}
        />
      )}
    </div>
  );
}
