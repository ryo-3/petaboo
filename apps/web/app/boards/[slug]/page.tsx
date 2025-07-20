import Main from "@/app/main";
import { auth } from "@clerk/nextjs/server";
import { QueryClient } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";
import { HydrationBoundary } from "@tanstack/react-query";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const pageStartTime = Date.now();
  
  const { slug } = await params;
  console.log(`🚀 BoardPage サーバーサイド開始 slug:${slug}`);
  
  let boardData: { id: number; name: string; description?: string | null } | null = null;
  let boardWithItems: any = null;
  const queryClient = new QueryClient();
  
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
          console.log(`✅ ボード基本情報取得完了`);
          
          // ボード詳細データも取得してキャッシュに設定
          const itemsFetchStartTime = Date.now();
          const itemsResponse = await fetch(`http://localhost:8794/boards/${boardData!.id}/items`, {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          console.log(`📡 ボード詳細Fetch完了: ${Date.now() - itemsFetchStartTime}ms`);
          
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            boardWithItems = {
              ...itemsData.board,
              items: itemsData.items,
            };
            // React Queryキャッシュに設定
            queryClient.setQueryData(["boards", boardData!.id, "items"], boardWithItems);
            console.log(`✅ BoardPage サーバーサイド完了: 総時間${Date.now() - pageStartTime}ms, アイテム数:${boardWithItems.items?.length || 0}`);
          }
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
      <HydrationBoundary state={dehydrate(queryClient)}>
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
      </HydrationBoundary>
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