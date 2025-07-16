import { auth } from "@clerk/nextjs/server";
import BoardSettingsScreen from "@/components/screens/board-settings-screen";
import { NavigationProvider } from "@/contexts/navigation-context";

interface BoardSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardSettingsPage({ params }: BoardSettingsPageProps) {
  const { slug } = await params;
  
  let boardData: { id: number; name: string; description?: string | null; completed: boolean } | null = null;
  
  // サーバーサイドでボード情報を取得
  try {
    const { userId, getToken } = await auth();
    
    if (userId) {
      const token = await getToken();
      const response = await fetch(`http://localhost:8794/boards/slug/${slug}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (response.ok) {
        boardData = await response.json();
      }
    }
  } catch (error) {
    console.error("Failed to fetch board:", error);
  }
  
  if (!boardData) {
    return <div>Board not found</div>;
  }
  
  return (
    <NavigationProvider 
      initialCurrentMode="board" 
      initialScreenMode="board"
    >
      <BoardSettingsScreen
        boardId={boardData.id}
        boardSlug={slug}
        initialBoardName={boardData.name}
        initialBoardDescription={boardData.description}
        initialBoardCompleted={boardData.completed}
      />
    </NavigationProvider>
  );
}