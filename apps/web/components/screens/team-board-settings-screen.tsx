"use client";

import TeamBoardSettings from "@/components/features/team-board/team-board-settings";
import DesktopLayout from "@/components/layout/desktop-layout";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useNavigation } from "@/contexts/navigation-context";

interface TeamBoardSettingsScreenProps {
  teamId: number;
  teamName: string;
  teamCustomUrl: string;
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
}

export default function TeamBoardSettingsScreen({
  teamId,
  teamName,
  teamCustomUrl,
  boardId,
  boardSlug,
  initialBoardName,
  initialBoardDescription,
  initialBoardCompleted,
}: TeamBoardSettingsScreenProps) {
  const { preferences } = useUserPreferences(1);
  const { currentMode, setCurrentMode } = useNavigation();

  // 空のハンドラー（設定画面では使用しない）
  const emptyHandler = () => {};

  return (
    <div className="flex h-screen w-full">
      {/* ヘッダー（設定で非表示可能） */}
      {!preferences?.hideHeader && <Header />}

      {/* サイドバー */}
      <div className="fixed left-0 top-16 w-16 h-screen border-r border-gray-200 overflow-visible z-10">
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
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          onSettings={emptyHandler}
          onSearch={emptyHandler}
          onDashboard={emptyHandler}
          currentBoardName={initialBoardName}
        />
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 pt-6 pl-6 pr-6 flex flex-col overflow-y-auto">
        <TeamBoardSettings
          teamId={teamId}
          teamCustomUrl={teamCustomUrl}
          boardId={boardId}
          boardSlug={boardSlug}
          initialBoardName={initialBoardName}
          initialBoardDescription={initialBoardDescription}
          initialBoardCompleted={initialBoardCompleted}
        />
      </div>
    </div>
  );
}
