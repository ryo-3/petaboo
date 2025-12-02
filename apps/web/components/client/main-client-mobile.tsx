import DeletedMemoList from "@/components/features/memo/deleted-memo-list";
import Sidebar from "@/components/layout/sidebar";
import ItemEditorFooter from "@/components/mobile/item-editor-footer";
import { useNavigation } from "@/src/contexts/navigation-context";
import type { Board } from "@/src/types/board";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";
import { useState, useEffect } from "react";

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
  // 最後に開いたボード（サイドバーのボード詳細アイコン用）
  lastBoardSlug?: string;
  lastBoardName?: string;
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
  lastBoardSlug,
  lastBoardName,
}: MainClientMobileProps) {
  // 新規作成状態を NavigationContext から取得（個人モード）
  const navigation = useNavigation();
  const isCreatingMemo = navigation.isCreatingMemo;
  const isCreatingTask = navigation.isCreatingTask;

  // ボード詳細のセクション表示状態
  const [activeBoardSection, setActiveBoardSection] = useState<
    "memos" | "tasks"
  >("memos");

  // ボード詳細のセクション切り替えイベントをリッスン
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent) => {
      const { section } = event.detail;
      setActiveBoardSection(section);
    };

    const handleSectionStateChange = (event: CustomEvent) => {
      const { activeSection } = event.detail;
      setActiveBoardSection(activeSection);
    };

    window.addEventListener(
      "board-section-change",
      handleSectionChange as EventListener,
    );
    window.addEventListener(
      "board-section-state-change",
      handleSectionStateChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "board-section-change",
        handleSectionChange as EventListener,
      );
      window.removeEventListener(
        "board-section-state-change",
        handleSectionStateChange as EventListener,
      );
    };
  }, []);

  // ボード一覧に戻る
  const handleBackToBoardList = () => {
    handleDashboard();
  };

  return (
    <div className="w-full md:hidden">
      {showDeleted ? (
        // 削除済みメモ一覧表示
        <DeletedMemoList
          onBackToMemos={handleBackToMemos}
          onSelectDeletedMemo={handleSelectDeletedMemo}
        />
      ) : showingBoardDetail ? (
        // ボード詳細時は専用フッター
        <ItemEditorFooter
          type="board"
          onBack={handleBackToBoardList}
          onMemoClick={() =>
            window.dispatchEvent(
              new CustomEvent("board-section-change", {
                detail: { section: "memos" },
              }),
            )
          }
          onTaskClick={() =>
            window.dispatchEvent(
              new CustomEvent("board-section-change", {
                detail: { section: "tasks" },
              }),
            )
          }
          onCommentClick={() =>
            window.dispatchEvent(
              new CustomEvent("board-section-change", {
                detail: { section: "comments" },
              }),
            )
          }
          activeSection={activeBoardSection}
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
          currentBoardName={
            lastBoardSlug
              ? initialBoardName || currentBoard?.name || lastBoardName
              : undefined
          }
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
