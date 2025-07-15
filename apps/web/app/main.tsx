import MainClient from "@/components/client/main-client";

interface MainProps {
  initialBoardName?: string;
  boardId?: number;
  showBoardHeader?: boolean;
  serverBoardTitle?: string;
  serverBoardDescription?: string | null;
}

function Main({ 
  initialBoardName, 
  boardId, 
  showBoardHeader = true, 
  serverBoardTitle, 
  serverBoardDescription 
}: MainProps = {}) {
  return (
    <MainClient 
      initialBoardName={initialBoardName}
      boardId={boardId}
      showBoardHeader={showBoardHeader}
      serverBoardTitle={serverBoardTitle}
      serverBoardDescription={serverBoardDescription}
    />
  );
}

export default Main;