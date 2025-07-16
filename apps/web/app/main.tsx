import MainClient from "@/components/client/main-client";
import { NavigationProvider } from "@/contexts/navigation-context";

interface MainProps {
  initialBoardName?: string;
  boardId?: number;
  showBoardHeader?: boolean;
  serverBoardTitle?: string;
  serverBoardDescription?: string | null;
  initialCurrentMode?: "memo" | "task" | "board";
}

function Main({ 
  initialBoardName, 
  boardId, 
  showBoardHeader = true, 
  serverBoardTitle, 
  serverBoardDescription,
  initialCurrentMode 
}: MainProps = {}) {
  return (
    <NavigationProvider initialCurrentMode={initialCurrentMode}>
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