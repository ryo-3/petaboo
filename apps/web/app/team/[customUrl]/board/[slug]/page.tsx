"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import { useTeamMemos } from "@/src/hooks/use-team-memos";
import { useTeamTasks } from "@/src/hooks/use-team-tasks";
import BoardDetailScreen from "@/components/screens/board-detail-screen-3panel";
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

    // まずクエリパラメータをチェック（リダイレクトから来た場合）
    const initialMemoParam = searchParams.get("initialMemo");
    const initialTaskParam = searchParams.get("initialTask");

    if (initialMemoParam) {
      setInitialMemoId(initialMemoParam);
      setInitialTaskId(null); // 他方をクリア
      setUrlParsed(true);
      return;
    }

    if (initialTaskParam) {
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
        setInitialMemoId(memoMatch[1]);
        setInitialTaskId(null);
        setUrlParsed(true);
        return;
      } else if (taskMatch?.[1]) {
        setInitialTaskId(taskMatch[1]);
        setInitialMemoId(null);
        setUrlParsed(true);
        return;
      }
    }

    // どのパターンにも該当しない場合も解析完了とする
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
      return;
    }

    // データがまだロード中の場合は処理を延期
    if (memosLoading || tasksLoading) {
      return;
    }

    // データが用意されていない場合は処理を延期
    if (!teamMemosData || !teamTasksData) {
      return;
    }

    // 新規作成中のアイテム（id === 0）がある場合は選択状態を変更しない
    if (selectedMemo && selectedMemo.id === 0) {
      return;
    }
    if (selectedTask && selectedTask.id === 0) {
      return;
    }
    let hasSelection = false;

    // 初期メモ選択（メモIDがある場合）
    if (initialMemoId) {
      const foundMemo = teamMemosData.find(
        (memo) => memo.id.toString() === initialMemoId,
      );
      if (foundMemo) {
        // 現在選択されているのと違う場合のみ更新
        if (!selectedMemo || selectedMemo.id.toString() !== initialMemoId) {
          // TeamMemo型をMemo型として扱う（型の互換性を仮定）
          // originalIdを正しく設定するためにfoundMemoのoriginalIdを使用
          const memoWithCorrectOriginalId = {
            ...foundMemo,
            originalId: foundMemo.originalId, // team_memosのoriginal_idを使用
          } as unknown as Memo;

          setSelectedMemo(memoWithCorrectOriginalId);
          setSelectedTask(null); // タスクの選択を解除
          // URLを更新してパス形式に統一
          const newUrl = `/team/${customUrl}/board/${slug}/memo/${foundMemo.id}`;
          window.history.replaceState(null, "", newUrl);
        }
        hasSelection = true;
      }
    }

    // 初期タスク選択（メモ選択がない場合でタスクIDがある場合）
    if (initialTaskId && !hasSelection) {
      const foundTask = teamTasksData.find(
        (task) => task.id.toString() === initialTaskId,
      );
      if (foundTask) {
        // 現在選択されているのと違う場合のみ更新
        if (!selectedTask || selectedTask.id.toString() !== initialTaskId) {
          // TeamTask型をTask型として扱う（型の互換性を仮定）
          setSelectedTask(foundTask as unknown as Task);
          setSelectedMemo(null); // メモの選択を解除
          // URLを更新してパス形式に統一
          const newUrl = `/team/${customUrl}/board/${slug}/task/${foundTask.id}`;
          window.history.replaceState(null, "", newUrl);
        } else {
        }
        hasSelection = true;
      } else {
      }
    }

    // URLにメモIDもタスクIDもない場合は何もしない（選択をクリアしない）
    if (!hasSelection) {
      // 選択状態を維持
    }
  }, [
    initialMemoId,
    initialTaskId,
    urlParsed,
    memosLoading,
    tasksLoading,
    teamMemosData,
    teamTasksData,
  ]);

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

  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    if (!memo) {
      return;
    }

    // タスクの選択を解除
    setSelectedTask(null);

    // URLを更新
    const newUrl = `/team/${customUrl}/board/${slug}/memo/${memo.id}`;
    window.history.replaceState(null, "", newUrl);

    // 削除済みメモを選択状態として設定
    setSelectedMemo(memo as unknown as Memo);
  };

  const handleBack = () => {
    router.push(`/team/${customUrl}?tab=boards`);
  };

  const handleSettings = () => {
    router.push(`/team/${customUrl}/board/${slug}/settings`);
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

    const handleSearch = () => {
      router.push(`/team/${customUrl}?tab=search`);
    };

    const handleTeamList = () => {
      // チームボード詳細ページからはチーム一覧タブに戻る
      router.push(`/team/${customUrl}?tab=team-list`);
    };

    const handleSettingsPage = () => {
      router.push(`/team/${customUrl}?tab=settings`);
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

    // 検索・チーム一覧・設定ボタンのイベントも処理
    window.addEventListener(
      "team-search-change",
      handleSearch as EventListener,
    );
    window.addEventListener(
      "team-list-change",
      handleTeamList as EventListener,
    );
    window.addEventListener(
      "team-settings-change",
      handleSettingsPage as EventListener,
    );

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
      window.removeEventListener(
        "team-search-change",
        handleSearch as EventListener,
      );
      window.removeEventListener(
        "team-list-change",
        handleTeamList as EventListener,
      );
      window.removeEventListener(
        "team-settings-change",
        handleSettingsPage as EventListener,
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

  // 既存のBoardDetailScreenコンポーネントを使用
  return (
    <BoardDetailScreen
      boardId={boardData.id}
      selectedMemo={selectedMemo}
      selectedTask={selectedTask}
      onSelectMemo={handleSelectMemo}
      onSelectTask={handleSelectTask}
      onSelectDeletedMemo={handleSelectDeletedMemo} // 削除済みメモ選択用（専用関数）
      onClearSelection={handleClearSelection}
      onBack={handleBack}
      onSettings={handleSettings}
      initialBoardName={boardData.name}
      initialBoardDescription={boardData.description}
      showBoardHeader={true}
      serverInitialTitle={boardData.name}
      teamMode={true}
      teamId={team.id}
    />
  );
}
