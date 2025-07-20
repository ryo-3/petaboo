import Main from "@/app/main";
import { auth } from "@clerk/nextjs/server";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const pageStartTime = Date.now();
  console.log(`🚀 BoardPage サーバーサイド開始 slug:${JSON.stringify(params)}`);
  
  const { slug } = await params;
  
  let boardData: { id: number; name: string; description?: string | null } | null = null;
  
  // サーバーサイドでボード名を取得（直接認証付きAPI呼び出し）
  if (slug) {
    try {
      const authStartTime = Date.now();
      const { userId, getToken } = await auth();
      console.log(`🔑 Auth完了: ${Date.now() - authStartTime}ms`);
      
      if (userId) {
        const tokenStartTime = Date.now();
        const token = await getToken();
        console.log(`🎫 Token取得完了: ${Date.now() - tokenStartTime}ms`);
        
        const fetchStartTime = Date.now();
        const response = await fetch(`http://localhost:8794/boards/slug/${slug}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        console.log(`📡 サーバーFetch完了: ${Date.now() - fetchStartTime}ms`);
        
        if (response.ok) {
          boardData = await response.json();
          console.log(`✅ BoardPage サーバーサイド完了: 総時間${Date.now() - pageStartTime}ms`);
        } else {
          console.error(`❌ サーバーFetch失敗: ${response.status} ${response.statusText}`);
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
        forceShowBoardDetail={true}
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