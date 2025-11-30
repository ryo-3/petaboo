import MainClient from "@/components/client/main-client";
import { NavigationProvider } from "@/src/contexts/navigation-context";

interface MainProps {
  initialBoardName?: string;
  boardId?: number;
  boardSlug?: string;
  showBoardHeader?: boolean;
  serverBoardTitle?: string;
  serverBoardDescription?: string | null;
  initialCurrentMode?: "memo" | "task" | "board";
  initialScreenMode?:
    | "home"
    | "memo"
    | "task"
    | "create"
    | "search"
    | "settings"
    | "board"
    | "welcome";
  forceShowBoardDetail?: boolean;
  teamMode?: boolean;
  teamId?: number;
  showAuthLoading?: boolean;
  isAuthenticated?: boolean;
  // ボード設定画面表示用
  showBoardSettings?: boolean;
  initialBoardCompleted?: boolean;
}

function Main({
  initialBoardName,
  boardId,
  boardSlug,
  showBoardHeader = true,
  serverBoardTitle,
  serverBoardDescription,
  initialCurrentMode,
  initialScreenMode,
  forceShowBoardDetail,
  teamMode,
  teamId,
  showBoardSettings,
  initialBoardCompleted,
}: MainProps = {}) {
  return (
    <NavigationProvider
      initialCurrentMode={initialCurrentMode}
      initialScreenMode={initialScreenMode}
      initialShowingBoardDetail={forceShowBoardDetail}
    >
      <MainClient
        initialBoardName={initialBoardName}
        boardId={boardId}
        boardSlug={boardSlug}
        showBoardHeader={showBoardHeader}
        serverBoardTitle={serverBoardTitle}
        serverBoardDescription={serverBoardDescription}
        forceShowBoardDetail={forceShowBoardDetail}
        teamMode={teamMode}
        teamId={teamId}
        showBoardSettings={showBoardSettings}
        initialBoardCompleted={initialBoardCompleted}
      />
    </NavigationProvider>
  );
}

export default Main;
