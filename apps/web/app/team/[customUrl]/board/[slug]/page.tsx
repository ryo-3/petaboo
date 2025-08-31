"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import BoardDetailScreen from "@/components/screens/board-detail-screen";
import { NavigationProvider } from "@/contexts/navigation-context";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export default function TeamBoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const customUrl = Array.isArray(params.customUrl)
    ? params.customUrl[0]
    : params.customUrl;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const {
    data: team,
    isLoading: teamLoading,
    error: teamError,
  } = useTeamDetail(customUrl || "");

  const [boardData, setBoardData] = useState<{
    id: number;
    name: string;
    description?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 選択状態管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | DeletedMemo | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<Task | DeletedTask | null>(
    null,
  );

  useEffect(() => {
    async function fetchTeamBoard() {
      if (!team || !slug) return;

      try {
        setLoading(true);
        const token = await getToken();

        // チームボード詳細を取得
        const boardResponse = await fetch(
          `${API_BASE_URL}/teams/${team.id}/boards/slug/${slug}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        if (!boardResponse.ok) {
          if (boardResponse.status === 404) {
            setError("ボードが見つかりません");
          } else {
            setError("ボードの取得に失敗しました");
          }
          return;
        }

        const board = await boardResponse.json();
        setBoardData(board);
      } catch (err) {
        console.error("チームボード取得エラー:", err);
        setError("ボードの取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    if (!teamLoading && team) {
      fetchTeamBoard();
    }
  }, [team, teamLoading, slug, getToken]);

  // エラーまたはボードが見つからない場合はチーム画面に戻る
  useEffect(() => {
    if (error && !loading) {
      router.push(`/team/${customUrl}?tab=boards`);
    }
  }, [error, loading, router, customUrl]);

  const handleClearSelection = () => {
    setSelectedMemo(null);
    setSelectedTask(null);
  };

  const handleBack = () => {
    router.push(`/team/${customUrl}?tab=boards`);
  };

  // ボード名をチームレイアウトに通知
  useEffect(() => {
    if (boardData) {
      window.dispatchEvent(
        new CustomEvent("team-board-name-change", {
          detail: { boardName: boardData.name },
        }),
      );
    }
  }, [boardData]);

  // チームレイアウトからのサイドバーイベントをリッスン
  useEffect(() => {
    const handleTeamModeChange = (event: CustomEvent) => {
      const { mode } = event.detail;

      if (mode === "overview") {
        router.push(`/team/${customUrl}`);
      } else if (mode === "memo") {
        router.push(`/team/${customUrl}?tab=memos`);
      } else if (mode === "task") {
        router.push(`/team/${customUrl}?tab=tasks`);
      } else if (mode === "board") {
        router.push(`/team/${customUrl}?tab=boards`);
      }
    };

    const handleTeamNewMemo = () => {
      router.push(`/team/${customUrl}?tab=memos`);
    };

    const handleHome = () => {
      router.push(`/team/${customUrl}`);
    };

    window.addEventListener(
      "team-mode-change",
      handleTeamModeChange as EventListener,
    );

    window.addEventListener(
      "team-new-memo",
      handleTeamNewMemo as EventListener,
    );

    // ホームボタンのイベントも処理
    window.addEventListener("team-home-change", handleHome as EventListener);

    return () => {
      window.removeEventListener(
        "team-mode-change",
        handleTeamModeChange as EventListener,
      );
      window.removeEventListener(
        "team-new-memo",
        handleTeamNewMemo as EventListener,
      );
      window.removeEventListener(
        "team-home-change",
        handleHome as EventListener,
      );
    };
  }, [router, customUrl]);

  if (!customUrl || !slug) {
    return <div>パラメーターが不正です</div>;
  }

  if (teamLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (teamError || !team || error || !boardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">
          {error ||
            (teamError &&
            typeof teamError === "object" &&
            "message" in teamError
              ? String(teamError.message)
              : "エラーが発生しました") ||
            "ボードが見つかりません"}
        </div>
      </div>
    );
  }

  // NavigationProviderでラップして既存のBoardDetailScreenコンポーネントを使用
  return (
    <NavigationProvider initialCurrentMode="board" initialScreenMode="board">
      <BoardDetailScreen
        boardId={boardData.id}
        selectedMemo={selectedMemo}
        selectedTask={selectedTask}
        onSelectMemo={setSelectedMemo}
        onSelectTask={setSelectedTask}
        onClearSelection={handleClearSelection}
        onBack={handleBack}
        initialBoardName={boardData.name}
        initialBoardDescription={boardData.description}
        showBoardHeader={true}
        serverInitialTitle={boardData.name}
        teamMode={true}
        teamId={team.id}
      />
    </NavigationProvider>
  );
}
