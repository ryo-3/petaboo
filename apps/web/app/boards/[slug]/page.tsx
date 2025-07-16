import Main from "@/app/main";
import { auth } from "@clerk/nextjs/server";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { slug } = await params;
  
  let boardData: { id: number; name: string; description?: string | null } | null = null;
  
  // サーバーサイドでボード名を取得（直接認証付きAPI呼び出し）
  if (slug) {
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
  }
  
  // サーバーサイドでボード情報を取得できた場合
  if (boardData) {
    return (
      <Main 
        initialBoardName={boardData.name}
        boardId={boardData.id}
        showBoardHeader={true}
        serverBoardTitle={boardData.name}
        serverBoardDescription={boardData.description}
        initialCurrentMode="board"
        initialScreenMode="board"
      />
    );
  }
  
  // フォールバック：ボード情報が取得できない場合
  return (
    <Main 
      initialBoardName={undefined}
      initialCurrentMode="board"
      initialScreenMode="board"
    />
  );
}