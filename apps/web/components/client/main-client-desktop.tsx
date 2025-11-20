import { ReactNode, useState, useEffect } from "react";
import DesktopLayout from "@/components/layout/desktop-layout";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import ItemEditorFooter from "@/components/mobile/item-editor-footer";
import type { Board } from "@/src/types/board";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
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
  boardSelectedItem:
    | { type: "memo"; item: Memo | DeletedMemo }
    | { type: "task"; item: Task | DeletedTask }
    | null;
  handleBoardClearSelection: () => void;
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
  boardSelectedItem,
  handleBoardClearSelection,
}: MainClientDesktopProps) {
  // 新規作成状態を判定
  const isCreatingMemo = screenMode === "create" && currentMode === "memo";
  const isCreatingTask = screenMode === "create" && currentMode === "task";

  // ボード詳細のセクション表示状態
  const [activeBoardSection, setActiveBoardSection] = useState<
    "memos" | "tasks"
  >("memos");

  // ボード詳細のセクション切り替えイベントをリッスン
  useEffect(() => {
    const handleSectionToggle = (event: CustomEvent) => {
      const { section } = event.detail;
      setActiveBoardSection(section);
    };

    const handleSectionStateChange = (event: CustomEvent) => {
      const { activeSection } = event.detail;
      setActiveBoardSection(activeSection);
    };

    window.addEventListener(
      "board-section-toggle",
      handleSectionToggle as EventListener,
    );
    window.addEventListener(
      "board-section-state-change",
      handleSectionStateChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "board-section-toggle",
        handleSectionToggle as EventListener,
      );
      window.removeEventListener(
        "board-section-state-change",
        handleSectionStateChange as EventListener,
      );
    };
  }, []);

  // ボード詳細での「戻る」処理
  const handleBackToBoardList = () => {
    // メモ/タスクを選択中（作成中含む）の場合は選択解除してボード詳細の一覧に戻る
    if (boardSelectedItem) {
      handleBoardClearSelection();
      return;
    }

    // 何も選択していない場合はボード一覧に戻る
    handleDashboard();
  };

  return (
    <div className="flex flex-col h-full md:h-screen w-full overflow-hidden">
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
          showingBoardDetail ? (
            <>
              {/* モバイル用ボード詳細フッター */}
              <div className="md:hidden h-full">
                <ItemEditorFooter
                  type="board"
                  onBack={handleBackToBoardList}
                  onMemoClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("board-section-toggle", {
                        detail: { section: "memos" },
                      }),
                    );
                  }}
                  onTaskClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("board-section-toggle", {
                        detail: { section: "tasks" },
                      }),
                    );
                  }}
                  activeSection={activeBoardSection}
                  hideComment={true}
                />
              </div>
              {/* PC用サイドバー */}
              <div className="hidden md:block h-full">
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
                  onBackToBoardList={handleBackToBoardList}
                />
              </div>
            </>
          ) : (
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
          )
        }
      >
        {children}
      </DesktopLayout>
    </div>
  );
}
