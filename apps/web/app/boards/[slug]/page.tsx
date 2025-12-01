import Main from "@/app/main";
import { auth } from "@clerk/nextjs/server";
import { QueryClient, dehydrate, Hydrate } from "@tanstack/react-query";
import type { BoardWithItems } from "@/src/types/board";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ settings?: string }>;
}

export default async function BoardPage({
  params,
  searchParams,
}: BoardPageProps) {
  const { slug } = await params;
  const { settings } = await searchParams;
  const showSettings = settings === "true";

  let boardData: {
    id: number;
    name: string;
    description?: string | null;
    completed?: boolean;
  } | null = null;
  let boardWithItems: BoardWithItems | null = null;
  const queryClient = new QueryClient();

  // サーバーサイドでボード名を取得（直接認証付きAPI呼び出し）
  if (slug) {
    try {
      const { userId, getToken } = await auth();

      if (userId) {
        const token = await getToken();
        const response = await fetch(
          `${process.env.API_URL || "http://localhost:7594"}/boards/slug/${slug}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        if (response.ok) {
          boardData = await response.json();

          // ボード詳細データも取得してキャッシュに設定
          const itemsResponse = await fetch(
            `${process.env.API_URL || "http://localhost:7594"}/boards/${boardData!.id}/items`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            },
          );

          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            boardWithItems = {
              ...itemsData.board,
              items: itemsData.items,
            };
            // React Queryキャッシュに設定
            queryClient.setQueryData(
              ["boards", boardData!.id, "items"],
              boardWithItems,
            );
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
      <Hydrate state={dehydrate(queryClient)}>
        <Main
          initialBoardName={boardData.name}
          boardId={boardData.id}
          showBoardHeader={true}
          serverBoardTitle={boardData.name}
          serverBoardDescription={boardData.description}
          initialCurrentMode="board"
          initialScreenMode="board"
          forceShowBoardDetail={true}
          showBoardSettings={showSettings}
          initialBoardCompleted={boardData.completed ?? false}
        />
      </Hydrate>
    );
  }

  // フォールバック：ボード情報が取得できない場合
  return (
    <Main
      initialBoardName={undefined}
      boardSlug={slug}
      initialCurrentMode="board"
      initialScreenMode="board"
      showBoardSettings={showSettings}
    />
  );
}
