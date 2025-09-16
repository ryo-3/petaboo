import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import TeamBoardSettingsScreen from "@/components/screens/team-board-settings-screen";
import { NavigationProvider } from "@/contexts/navigation-context";

interface TeamBoardSettingsPageProps {
  params: Promise<{ customUrl: string; slug: string }>;
}

export default async function TeamBoardSettingsPage({
  params,
}: TeamBoardSettingsPageProps) {
  const { customUrl, slug } = await params;

  let teamData: {
    id: number;
    name: string;
    customUrl: string;
  } | null = null;

  let boardData: {
    id: number;
    name: string;
    description?: string | null;
    completed: boolean;
  } | null = null;

  // サーバーサイドでチーム情報とボード情報を取得
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return notFound();
    }

    const token = await getToken();
    const API_URL = process.env.API_URL || "http://localhost:7594";

    // チーム情報を取得
    const teamResponse = await fetch(`${API_URL}/teams/${customUrl}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (teamResponse.ok) {
      teamData = await teamResponse.json();
    }

    // チームボード情報を取得
    if (teamData) {
      const boardResponse = await fetch(
        `${API_URL}/teams/${teamData.id}/boards/slug/${slug}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (boardResponse.ok) {
        boardData = await boardResponse.json();
      }
    }
  } catch (error) {
    console.error("Failed to fetch team or board:", error);
  }

  if (!teamData || !boardData) {
    return notFound();
  }

  return (
    <NavigationProvider initialCurrentMode="board" initialScreenMode="board">
      <TeamBoardSettingsScreen
        teamId={teamData.id}
        teamName={teamData.name}
        teamCustomUrl={teamData.customUrl}
        boardId={boardData.id}
        boardSlug={slug}
        initialBoardName={boardData.name}
        initialBoardDescription={boardData.description}
        initialBoardCompleted={boardData.completed}
      />
    </NavigationProvider>
  );
}
