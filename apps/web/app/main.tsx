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
}

function Main({ 
  initialBoardName, 
  boardId, 
  showBoardHeader = true, 
  serverBoardTitle, 
  serverBoardDescription,
  initialCurrentMode,
  initialScreenMode
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
      />
    </NavigationProvider>
  );
}

export default Main;