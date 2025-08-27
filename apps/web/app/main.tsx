import MainClient from "@/components/client/main-client";
import { NavigationProvider } from "@/contexts/navigation-context";

interface MainProps {
  initialBoardName?: string;
  boardId?: number;
  showBoardHeader?: boolean;
  serverBoardTitle?: string;
  serverBoardDescription?: string | null;
  initialCurrentMode?: "memo" | "task" | "board";
  initialScreenMode?: "home" | "memo" | "task" | "create" | "search" | "settings" | "board";
  forceShowBoardDetail?: boolean;
  teamMode?: boolean;
  teamId?: number;
}

function Main({ 
  initialBoardName, 
  boardId, 
  showBoardHeader = true, 
  serverBoardTitle, 
  serverBoardDescription,
  initialCurrentMode,
  initialScreenMode,
  forceShowBoardDetail,
  teamMode,
  teamId
}: MainProps = {}) {
  return (
    <NavigationProvider 
      initialCurrentMode={initialCurrentMode}
      initialScreenMode={initialScreenMode}
    >
      <MainClient 
        initialBoardName={initialBoardName}
        boardId={boardId}
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