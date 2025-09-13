"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import { useTeamMemos } from "@/src/hooks/use-team-memos";
import { useTeamTasks } from "@/src/hooks/use-team-tasks";
import BoardDetailScreen from "@/components/screens/board-detail-screen";
import { NavigationProvider } from "@/contexts/navigation-context";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export default function TeamBoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const customUrl = Array.isArray(params.customUrl)
    ? params.customUrl[0]
    : params.customUrl;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  // URLから初期選択アイテムを取得（メモ化で安定化）
  const [initialMemoId, setInitialMemoId] = useState<string | null>(null);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);
  const [urlParsed, setUrlParsed] = useState(false); // URL解析完了フラグ

  // ページロード時にURLパスまたはクエリパラメータからメモ/タスクIDを抽出（1回だけ実行）
  useEffect(() => {
    if (urlParsed) return; // 既に解析済みなら何もしない

    console.log(
      `📍 [URL解析] 開始: pathname=${window.location.pathname}, search=${window.location.search}`,
    );

    // まずクエリパラメータをチェック（リダイレクトから来た場合）
    const initialMemoParam = searchParams.get("initialMemo");
    const initialTaskParam = searchParams.get("initialTask");

    if (initialMemoParam) {
      console.log(
        `📍 [URL解析] クエリパラメータからメモID取得: ${initialMemoParam}`,
      );
      setInitialMemoId(initialMemoParam);
      setInitialTaskId(null); // 他方をクリア
      setUrlParsed(true);
      return;
    }

    if (initialTaskParam) {
      console.log(
        `📍 [URL解析] クエリパラメータからタスクID取得: ${initialTaskParam}`,
      );
      setInitialTaskId(initialTaskParam);
      setInitialMemoId(null); // 他方をクリア
      setUrlParsed(true);
      return;
    }

    // 直接URLパスからも確認（念のため）
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const memoMatch = pathname.match(/\/memo\/(\d+)$/);
      const taskMatch = pathname.match(/\/task\/(\d+)$/);

      if (memoMatch?.[1]) {
        console.log(`📍 [URL解析] パスからメモID取得: ${memoMatch[1]}`);
        setInitialMemoId(memoMatch[1]);
        setInitialTaskId(null);
        setUrlParsed(true);
        return;
      } else if (taskMatch?.[1]) {
        console.log(`📍 [URL解析] パスからタスクID取得: ${taskMatch[1]}`);
        setInitialTaskId(taskMatch[1]);
        setInitialMemoId(null);
        setUrlParsed(true);
        return;
      }
    }

    // どのパターンにも該当しない場合も解析完了とする
    console.log(`📍 [URL解析] 該当するパラメータなし`);
    setUrlParsed(true);
  }, [searchParams, urlParsed]);

  const {
    data: team,
    isLoading: teamLoading,
    error: teamError,
  } = useTeamDetail(customUrl || "");

  // チームメモ・タスクデータを取得（初期選択のために必要）
  const { data: teamMemosData, isLoading: memosLoading } = useTeamMemos(
    team?.id,
  );

  const { data: teamTasksData, isLoading: tasksLoading } = useTeamTasks(
    team?.id,
  );

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

  // URLパラメータから初期選択を設定（URL解析完了後のみ実行）
  useEffect(() => {
    // URL解析が完了していない場合は待機
    if (!urlParsed) {
      console.log(`⏳ [URL初期選択] URL解析待機中`);
      return;
    }

    // データがまだロード中の場合は処理を延期
    if (memosLoading || tasksLoading) {
      console.log(`⏳ [URL初期選択] データロード中のため待機`);
      return;
    }

    // データが用意されていない場合は処理を延期
    if (!teamMemosData || !teamTasksData) {
      console.log(`⏳ [URL初期選択] チームデータ未取得のため待機`);
      return;
    }

    console.log(
      `🎯 [URL初期選択] チェック開始: memoId=${initialMemoId}, taskId=${initialTaskId}`,
    );
    console.log(
      `🎯 [URL初期選択] データ状態: teamMemosData=${teamMemosData.length}件, teamTasksData=${teamTasksData.length}件`,
    );

    let hasSelection = false;

    // 初期メモ選択（メモIDがある場合）
    if (initialMemoId) {
      console.log(`🎯 [URL初期選択] メモ検索開始: ID=${initialMemoId}`);

      const foundMemo = teamMemosData.find(
        (memo) => memo.id.toString() === initialMemoId,
      );
      if (foundMemo) {
        // 現在選択されているのと違う場合のみ更新
        if (!selectedMemo || selectedMemo.id.toString() !== initialMemoId) {
          console.log(`✅ [URL初期選択] メモ発見・選択: ${foundMemo.title}`);
          // TeamMemo型をMemo型として扱う（型の互換性を仮定）
          setSelectedMemo(foundMemo as unknown as Memo);
          setSelectedTask(null); // タスクの選択を解除
        } else {
          console.log(`✅ [URL初期選択] メモ既選択: ${foundMemo.title}`);
        }
        hasSelection = true;
      } else {
        console.log(`❌ [URL初期選択] メモが見つからない: ID=${initialMemoId}`);
      }
    }

    // 初期タスク選択（メモ選択がない場合でタスクIDがある場合）
    if (initialTaskId && !hasSelection) {
      console.log(`🎯 [URL初期選択] タスク検索開始: ID=${initialTaskId}`);

      const foundTask = teamTasksData.find(
        (task) => task.id.toString() === initialTaskId,
      );
      if (foundTask) {
        // 現在選択されているのと違う場合のみ更新
        if (!selectedTask || selectedTask.id.toString() !== initialTaskId) {
          console.log(`✅ [URL初期選択] タスク発見・選択: ${foundTask.title}`);
          // TeamTask型をTask型として扱う（型の互換性を仮定）
          setSelectedTask(foundTask as unknown as Task);
          setSelectedMemo(null); // メモの選択を解除
        } else {
          console.log(`✅ [URL初期選択] タスク既選択: ${foundTask.title}`);
        }
        hasSelection = true;
      } else {
        console.log(
          `❌ [URL初期選択] タスクが見つからない: ID=${initialTaskId}`,
        );
      }
    }

    // URLにメモIDもタスクIDもない場合は何もしない（選択をクリアしない）

    if (!hasSelection) {
      console.log(`🎯 [URL初期選択] 処理完了 - 条件に該当するアイテムなし`);
    }
  }, [initialMemoId, initialTaskId, urlParsed, memosLoading, tasksLoading]);

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
    // 選択解除時はベースのボードURLに戻す
    const baseUrl = `/team/${customUrl}/board/${slug}`;
    window.history.replaceState(null, "", baseUrl);
    setSelectedMemo(null);
    setSelectedTask(null);
  };

  const handleSelectMemo = (memo: Memo | DeletedMemo | null) => {
    if (!memo) return;
    // メモ選択時はタスクの選択を解除
    setSelectedTask(null);
    // URLを更新
    const newUrl = `/team/${customUrl}/board/${slug}/memo/${memo.id}`;
    window.history.replaceState(null, "", newUrl);
    setSelectedMemo(memo);
  };

  const handleSelectTask = (task: Task | DeletedTask | null) => {
    if (!task) return;
    // タスク選択時はメモの選択を解除
    setSelectedMemo(null);
    // URLを更新
    const newUrl = `/team/${customUrl}/board/${slug}/task/${task.id}`;
    window.history.replaceState(null, "", newUrl);
    setSelectedTask(task);
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
        onSelectMemo={handleSelectMemo}
        onSelectTask={handleSelectTask}
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
