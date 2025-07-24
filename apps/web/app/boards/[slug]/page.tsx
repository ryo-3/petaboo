import Main from "@/app/main";
import { auth } from "@clerk/nextjs/server";
import { QueryClient } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";
import { HydrationBoundary } from "@tanstack/react-query";
import type { BoardWithItems } from "@/src/types/board";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { slug } = await params;
  
  let boardData: { id: number; name: string; description?: string | null } | null = null;
  let boardWithItems: BoardWithItems | null = null;
  const queryClient = new QueryClient();
  
  // サーバーサイドでボード名を取得（直接認証付きAPI呼び出し）
  if (slug) {
    try {
      const { userId, getToken } = await auth();
      
      if (userId) {
        const token = await getToken();
        const response = await fetch(`${process.env.API_URL || 'http://localhost:8794'}/boards/slug/${slug}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        if (response.ok) {
          boardData = await response.json();
          
          // ボード詳細データも取得してキャッシュに設定
          const itemsResponse = await fetch(`${process.env.API_URL || 'http://localhost:8794'}/boards/${boardData!.id}/items`, {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            boardWithItems = {
              ...itemsData.board,
              items: itemsData.items,
            };
            // React Queryキャッシュに設定
            queryClient.setQueryData(["boards", boardData!.id, "items"], boardWithItems);
          }
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