"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import BoardDetailScreen from "@/components/screens/board-detail-screen-3panel";
import SharedBoardSettings from "@/components/features/board/shared-board-settings";
import {
  useUpdateTeamBoard,
  useToggleTeamBoardCompletion,
  useDeleteTeamBoard,
} from "@/src/hooks/use-team-boards";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import type { TeamMember } from "@/src/hooks/use-team-detail";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

interface TeamBoardDetailWrapperProps {
  slug: string;
  teamId?: number;
  customUrl: string;
  teamMembers?: TeamMember[];
  onBack: () => void;
}

export function TeamBoardDetailWrapper({
  slug,
  teamId,
  customUrl,
  teamMembers = [],
  onBack,
}: TeamBoardDetailWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isLoaded } = useAuth();

  // 設定画面表示判定
  const showSettings = searchParams.get("settings") === "true";
  const boardIdParam = searchParams.get("boardId");

  // URLパラメータからメモ/タスクIDを取得
  const memoParam = searchParams.get("memo");
  const taskParam = searchParams.get("task");

  // チームボード用のhooks
  const updateBoard = useUpdateTeamBoard(teamId || 0);
  const toggleCompletion = useToggleTeamBoardCompletion(teamId || 0);
  const deleteBoard = useDeleteTeamBoard(teamId || 0);

  // 選択状態管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | DeletedMemo | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<Task | DeletedTask | null>(
    null,
  );

  // ボード詳細を取得（React Queryでキャッシュ活用）
  const {
    data: boardData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["team-board", teamId, slug, boardIdParam],
    queryFn: async () => {
      if (!teamId) {
        throw new Error("teamId is required");
      }

      const token = await getToken();
      const fetchOptions: RequestInit = {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };

      const fetchBoardBySlug = async (slugValue: string) => {
        const response = await fetch(
          `${API_BASE_URL}/teams/${teamId}/boards/slug/${slugValue.toUpperCase()}`,
          fetchOptions,
        );
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error("ボードの取得に失敗しました");
        }
        return response.json();
      };

      const fetchBoardById = async (boardIdValue: string) => {
        const response = await fetch(
          `${API_BASE_URL}/teams/${teamId}/boards/${boardIdValue}/items`,
          fetchOptions,
        );
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error("ボードの取得に失敗しました");
        }
        const data = await response.json();
        return data?.board ?? null;
      };

      const slugIsNumeric = /^\d+$/.test(slug);
      const fallbackBoardId =
        boardIdParam || (slugIsNumeric ? slug : undefined);

      if (!slugIsNumeric) {
        const board = await fetchBoardBySlug(slug);
        if (board) return board;
      } else {
        const board = await fetchBoardBySlug(slug);
        if (board) return board;
      }

      if (fallbackBoardId) {
        const board = await fetchBoardById(fallbackBoardId);
        if (board) return board;
      }

      throw new Error("ボードが見つかりません");
    },
    enabled: isLoaded && !!teamId && (!!slug || !!boardIdParam),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    cacheTime: 30 * 60 * 1000, // 30分間保持
  });

  // ボード名をlayoutに通知
  useEffect(() => {
    if (boardData) {
      window.dispatchEvent(
        new CustomEvent("team-board-name-change", {
          detail: { boardName: boardData.name },
        }),
      );
    }
  }, [boardData]);

  // エラー時はボード一覧に戻る
  useEffect(() => {
    if (error) {
      console.error("Board fetch error:", error);
      onBack();
    }
  }, [error, onBack]);

  useEffect(() => {
    if (!boardData) return;

    if (/^\d+$/.test(slug) && boardData.slug && boardData.slug !== slug) {
      router.replace(`/team/${customUrl}?board=${boardData.slug}`, {
        scroll: false,
      });
    } else if (!slug && boardData.slug) {
      router.replace(`/team/${customUrl}?board=${boardData.slug}`, {
        scroll: false,
      });
    }
  }, [boardData, slug, customUrl, router]);

  // URLパラメータからメモ/タスクを復元（ボードアイテム取得が必要）
  const { data: boardItems, isLoading: boardItemsLoading } = useQuery({
    queryKey: ["team-board-items", teamId, boardData?.id, memoParam, taskParam],
    queryFn: async () => {
      if (!teamId || !boardData?.id) return null;

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/boards/${boardData.id}/items`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("ボードアイテムの取得に失敗しました");
      }

      return response.json();
    },
    // URLパラメータがある場合のみ取得（最適化）
    enabled: !!teamId && !!boardData?.id && (!!memoParam || !!taskParam),
    staleTime: 5 * 60 * 1000,
  });

  // URLパラメータが削除された場合に選択状態をクリア
  useEffect(() => {
    if (!memoParam && !taskParam) {
      setSelectedMemo(null);
      setSelectedTask(null);
    }
  }, [memoParam, taskParam]);

  // URLパラメータに基づいてメモ/タスクを選択
  // ただし、既に選択済み（新規作成含む）の場合はスキップ
  const selectedMemoRef = useRef(selectedMemo);
  selectedMemoRef.current = selectedMemo;
  const selectedTaskRef = useRef(selectedTask);
  selectedTaskRef.current = selectedTask;

  useEffect(() => {
    if (!boardItems) return;

    // memoパラメータがある場合、該当するメモを選択
    if (memoParam) {
      const allItems = boardItems.items || [];
      const memoItems = allItems.filter(
        (item: any) => item.itemType === "memo",
      );

      // URLパラメータはboardIndexを表すので、boardIndexだけで検索
      const targetMemo = memoItems
        .map((item: any) => item.content)
        .find((m: Memo) => m.boardIndex?.toString() === memoParam);

      // 既に正しいメモが選択されている場合はスキップ
      if (targetMemo && selectedMemoRef.current) {
        // boardIndexで比較（これが一番確実）
        if (targetMemo.boardIndex === selectedMemoRef.current.boardIndex) {
          return;
        }
      }

      if (targetMemo && targetMemo.displayId !== selectedMemo?.displayId) {
        setSelectedMemo(targetMemo);
        setSelectedTask(null);
      }
    }

    // taskパラメータがある場合、該当するタスクを選択
    if (taskParam) {
      const allItems = boardItems.items || [];
      const taskItems = allItems.filter(
        (item: any) => item.itemType === "task",
      );

      // URLパラメータはboardIndexを表すので、boardIndexだけで検索
      const targetTask = taskItems
        .map((item: any) => item.content)
        .find((t: Task) => t.boardIndex?.toString() === taskParam);

      // 既に正しいタスクが選択されている場合はスキップ
      if (targetTask && selectedTaskRef.current) {
        // boardIndexで比較（これが一番確実）
        if (targetTask.boardIndex === selectedTaskRef.current.boardIndex) {
          return;
        }
      }

      if (targetTask && targetTask.displayId !== selectedTask?.displayId) {
        setSelectedTask(targetTask);
        setSelectedMemo(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardItems, memoParam, taskParam]);

  const handleClearSelection = () => {
    setSelectedMemo(null);
    setSelectedTask(null);

    // URLからメモ/タスクIDを削除
    router.replace(`/team/${customUrl}?board=${slug}`, {
      scroll: false,
    });
  };

  const handleSelectMemo = (memo: Memo | DeletedMemo | null) => {
    setSelectedTask(null);
    setSelectedMemo(memo);

    // URLを更新（boardIndexを使用 - ボード内での連番）
    // 新規作成時 (displayId === "new") またはboardIndexが未設定の場合はURL更新をスキップ
    if (memo && memo.boardIndex && memo.boardIndex > 0) {
      // boardIndexが存在する場合のみURL更新
      router.replace(
        `/team/${customUrl}?board=${slug}&memo=${memo.boardIndex}`,
        { scroll: false },
      );
    } else if (!memo) {
      router.replace(`/team/${customUrl}?board=${slug}`, {
        scroll: false,
      });
    }
    // 新規作成時またはboardIndex未設定時はURL更新をスキップ
  };

  const handleSelectTask = (task: Task | DeletedTask | null) => {
    setSelectedMemo(null);
    setSelectedTask(task);

    // URLを更新（boardIndexを使用 - ボード内での連番）
    // 新規作成時 (displayId === "new") またはboardIndexが未設定の場合はURL更新をスキップ
    if (task && task.boardIndex && task.boardIndex > 0) {
      // boardIndexが存在する場合のみURL更新
      router.replace(
        `/team/${customUrl}?board=${slug}&task=${task.boardIndex}`,
        { scroll: false },
      );
    } else if (!task) {
      router.replace(`/team/${customUrl}?board=${slug}`, {
        scroll: false,
      });
    }
    // 新規作成時またはboardIndex未設定時はURL更新をスキップ
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    if (!memo) return;
    setSelectedTask(null);
    setSelectedMemo(memo as unknown as Memo);
  };

  // チームボード設定画面への遷移
  const handleSettings = () => {
    router.push(`/team/${customUrl}?board=${slug}&settings=true`);
  };

  // URLからの復元が必要な場合（URLパラメータあり＆選択なし）のみローディング表示
  // ユーザーが手動で選択した場合はURLが更新されても待たない
  const needsUrlRestore =
    (memoParam && !selectedMemo) || (taskParam && !selectedTask);
  const isFullyLoaded = !loading && !needsUrlRestore;

  if (!isFullyLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">
          {error instanceof Error ? error.message : "ボードが見つかりません"}
        </div>
      </div>
    );
  }

  // 設定画面を表示
  if (showSettings) {
    return (
      <div className="h-full flex flex-col overflow-hidden md:overflow-y-auto pt-6 pl-6 pr-6">
        <SharedBoardSettings
          boardId={boardData.id}
          boardSlug={slug}
          initialBoardName={boardData.name}
          initialBoardDescription={boardData.description}
          initialBoardCompleted={boardData.completed || false}
          isTeamMode={true}
          teamCustomUrl={customUrl}
          updateMutation={updateBoard}
          toggleCompletionMutation={toggleCompletion}
          deleteMutation={deleteBoard}
        />
      </div>
    );
  }

  // ボード詳細を表示
  return (
    <BoardDetailScreen
      boardId={boardData.id}
      selectedMemo={selectedMemo}
      selectedTask={selectedTask}
      onSelectMemo={handleSelectMemo}
      onSelectTask={handleSelectTask}
      onSelectDeletedMemo={handleSelectDeletedMemo}
      onClearSelection={handleClearSelection}
      onBack={onBack}
      onSettings={handleSettings}
      initialBoardName={boardData.name}
      initialBoardDescription={boardData.description}
      showBoardHeader={true}
      serverInitialTitle={boardData.name}
    />
  );
}
