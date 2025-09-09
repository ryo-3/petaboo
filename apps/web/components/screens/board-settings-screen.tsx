"use client";

import BoardSettings from "@/components/features/board/board-settings";
import DesktopLayout from "@/components/layout/desktop-layout";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useNavigation } from "@/contexts/navigation-context";

interface BoardSettingsScreenProps {
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
}

export default function BoardSettingsScreen({
  boardId,
  boardSlug,
  initialBoardName,
  initialBoardDescription,
  initialBoardCompleted,
}: BoardSettingsScreenProps) {
  const { preferences } = useUserPreferences(1);
  const { currentMode, setCurrentMode } = useNavigation();

  // 空のハンドラー（設定画面では使用しない）
  const emptyHandler = () => {};

  return (
    <div className="flex flex-col h-screen w-full">
      {/* ヘッダー（設定で非表示可能） */}
      {!preferences?.hideHeader && <Header />}

      {/* メインレイアウト */}
      <DesktopLayout
        hideHeader={preferences?.hideHeader}
        sidebarContent={
          <Sidebar
            onSelectMemo={emptyHandler}
            onSelectTask={emptyHandler}
            onEditTask={emptyHandler}
            onShowFullList={emptyHandler}
            onShowTaskList={emptyHandler}
            onHome={emptyHandler}
            onEditMemo={emptyHandler}
            onDeleteMemo={emptyHandler}
            selectedMemoId={undefined}
            selectedTaskId={undefined}
            isCompact={true}
            currentMode={currentMode}
            onModeChange={setCurrentMode}
            onSettings={emptyHandler}
            onSearch={emptyHandler}
            onDashboard={emptyHandler}
            isBoardActive={true}
            currentBoardName={initialBoardName}
          />
        }
      >
        <div className="h-full pt-6 pl-6 pr-6 flex flex-col">
          <BoardSettings
            boardId={boardId}
            boardSlug={boardSlug}
            initialBoardName={initialBoardName}
            initialBoardDescription={initialBoardDescription}
            initialBoardCompleted={initialBoardCompleted}
          />
        </div>
      </DesktopLayout>
    </div>
  );
}
