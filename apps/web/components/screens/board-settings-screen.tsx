"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BoardSettings from "@/components/features/board/board-settings";
import DesktopLayout from "@/components/layout/desktop-layout";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useNavigation } from "@/src/contexts/navigation-context";

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
  const router = useRouter();
  const { preferences } = useUserPreferences(1);
  const { currentMode, setCurrentMode } = useNavigation();

  // ヘッダーにボード名を伝える
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("team-board-name-change", {
        detail: {
          boardName: initialBoardName,
          boardDescription: initialBoardDescription,
          boardSlug: boardSlug,
        },
      }),
    );

    return () => {
      window.dispatchEvent(new CustomEvent("team-clear-board-name"));
    };
  }, [initialBoardName, initialBoardDescription, boardSlug]);

  // ナビゲーションハンドラー
  const handleHome = () => router.push("/");
  const handleShowFullList = () => router.push("/?mode=memo");
  const handleShowTaskList = () => router.push("/?mode=task");
  const handleSettings = () => router.push("/settings");
  const handleSearch = () => router.push("/?search=true");
  const handleDashboard = () => router.push("/?mode=board");
  const handleBoardDetail = () => router.push(`/boards/${boardSlug}`);

  // 使用しないハンドラー（設定画面では不要）
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
            onShowFullList={handleShowFullList}
            onShowTaskList={handleShowTaskList}
            onHome={handleHome}
            onEditMemo={emptyHandler}
            onDeleteMemo={emptyHandler}
            selectedMemoId={undefined}
            selectedTaskId={undefined}
            currentMode={currentMode}
            onModeChange={setCurrentMode}
            onSettings={handleSettings}
            onSearch={handleSearch}
            onDashboard={handleDashboard}
            onBoardDetail={handleBoardDetail}
            currentBoardName={initialBoardName}
          />
        }
      >
        <div className="h-full pt-6 pl-6 pr-6 flex flex-col overflow-y-auto">
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
