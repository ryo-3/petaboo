import MainClient from "@/components/client/main-client";
import { NavigationProvider } from "@/contexts/navigation-context";

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
}: MainProps = {}) {
  return (
    <NavigationProvider
      initialCurrentMode={initialCurrentMode}
      initialScreenMode={initialScreenMode}
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
      />
    </NavigationProvider>
  );
}

export default Main;
