import Main from "@/app/main";
import { auth } from "@clerk/nextjs/server";

interface BoardsPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function BoardsPage({ params }: BoardsPageProps) {
  const { slug } = await params;
  const boardSlug = slug?.[0];

  let boardData: {
    id: number;
    name: string;
    description?: string | null;
  } | null = null;

  // サーバーサイドでボード名を取得（直接認証付きAPI呼び出し）
  if (boardSlug) {
    try {
      const { userId, getToken } = await auth();

      if (userId) {
        const token = await getToken();
        const response = await fetch(
          `${process.env.API_URL || "http://localhost:8794"}/boards/slug/${boardSlug}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        if (response.ok) {
          boardData = await response.json();
        }
      }
    } catch {
      // エラーは無視してクライアントサイドで処理
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
