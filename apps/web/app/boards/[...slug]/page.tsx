import Main from "@/app/main";
import { auth } from "@clerk/nextjs/server";

interface BoardsPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function BoardsPage({ params }: BoardsPageProps) {
  const { slug } = await params;
  const boardSlug = slug?.[0];
  
  // console.log('🔍 BoardsPage開始, slug:', boardSlug);
  
  let boardData: { id: number; name: string; description?: string | null } | null = null;
  
  // サーバーサイドでボード名を取得（直接認証付きAPI呼び出し）
  if (boardSlug) {
    try {
      // console.log('🔍 サーバーサイドでボード情報取得開始:', boardSlug);
      const { userId, getToken } = await auth();
      
      if (userId) {
        const token = await getToken();
        const response = await fetch(`http://localhost:8794/boards/slug/${boardSlug}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        if (response.ok) {
          boardData = await response.json();
          // console.log('🔍 サーバーサイドでボード情報取得成功:', boardData);
        } else {
          // console.log('🔍 サーバーサイドでボード情報取得失敗:', response.status);
        }
      }
    } catch (error) {
      // console.log('🔍 サーバーサイドでボード情報取得エラー:', error);
    }
  }
  
  // サーバーサイドでボード情報を取得できた場合
  if (boardData) {
    // console.log('🔍 サーバーサイドでボードデータ表示:', boardData);
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
  // console.log('🔍 フォールバック実行, boardData:', boardData);
  return (
    <Main 
      initialBoardName={undefined}
      initialCurrentMode="board"
      initialScreenMode="board"
    />
  );
}