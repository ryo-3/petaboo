"use client";

import { useEffect, useState } from "react";
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
          `${API_BASE_URL}/teams/${teamId}/boards/slug/${slugValue}`,
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
      router.replace(`/team/${customUrl}?tab=board&slug=${boardData.slug}`, {
        scroll: false,
      });
    } else if (!slug && boardData.slug) {
      router.replace(`/team/${customUrl}?tab=board&slug=${boardData.slug}`, {
        scroll: false,
      });
    }
  }, [boardData, slug, customUrl, router]);

  const handleClearSelection = () => {
    setSelectedMemo(null);
    setSelectedTask(null);
  };

  const handleSelectMemo = (memo: Memo | DeletedMemo | null) => {
    setSelectedTask(null);
    setSelectedMemo(memo);
  };

  const handleSelectTask = (task: Task | DeletedTask | null) => {
    setSelectedMemo(null);
    setSelectedTask(task);
  };

  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    if (!memo) return;
    setSelectedTask(null);
    setSelectedMemo(memo as unknown as Memo);
  };

  // チームボード設定画面への遷移
  const handleSettings = () => {
    router.push(`/team/${customUrl}?tab=board&slug=${slug}&settings=true`);
  };

  if (loading) {
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
      <div className="h-full flex flex-col overflow-y-auto pt-6 pl-6 pr-6">
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
      teamMembers={teamMembers}
    />
  );
}
