"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTeamMemos } from "@/src/hooks/use-team-memos";
import { useTeamTasks } from "@/src/hooks/use-team-tasks";
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

  // 設定モーダルの状態（URLパラメータから取得）
  const showSettings = searchParams.get("settings") === "true";

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
    queryKey: ["team-board", teamId, slug],
    queryFn: async () => {
      if (!teamId || !slug) {
        throw new Error("teamId and slug are required");
      }

      const token = await getToken();
      const boardResponse = await fetch(
        `${API_BASE_URL}/teams/${teamId}/boards/slug/${slug}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!boardResponse.ok) {
        if (boardResponse.status === 404) {
          throw new Error("ボードが見つかりません");
        } else {
          throw new Error("ボードの取得に失敗しました");
        }
      }

      return boardResponse.json();
    },
    enabled: isLoaded && !!teamId && !!slug,
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

  const handleClearSelection = () => {
    setSelectedMemo(null);
    setSelectedTask(null);
  };

  const handleSelectMemo = (memo: Memo | DeletedMemo | null) => {
    if (!memo) return;
    setSelectedTask(null);
    setSelectedMemo(memo);
  };

  const handleSelectTask = (task: Task | DeletedTask | null) => {
    if (!task) return;
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

  // 設定モーダルを閉じる
  const handleCloseSettings = () => {
    router.push(`/team/${customUrl}?tab=board&slug=${slug}`);
  };

  // チームボード用のhooks
  const updateBoard = useUpdateTeamBoard(teamId || 0);
  const toggleCompletion = useToggleTeamBoardCompletion(teamId || 0);
  const deleteBoard = useDeleteTeamBoard(teamId || 0);

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

  return (
    <>
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

      {/* ボード設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">ボード設定</h2>
                <button
                  onClick={handleCloseSettings}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <SharedBoardSettings
                boardId={boardData.id}
                boardSlug={slug}
                initialBoardName={boardData.name}
                initialBoardDescription={boardData.description}
                initialBoardCompleted={boardData.completed || false}
                isTeamMode={true}
                teamCustomUrl={customUrl}
                hideBackButton={true}
                updateMutation={updateBoard}
                toggleCompletionMutation={toggleCompletion}
                deleteMutation={deleteBoard}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
