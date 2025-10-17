import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  getTeamComments,
  getAllTeamBoardComments,
  getBoardItemComments,
  createTeamComment,
  updateTeamComment,
  deleteTeamComment,
  CreateCommentInput,
} from "@/lib/api/comments";

export function useTeamComments(
  teamId: number | undefined,
  targetType: "memo" | "task" | "board",
  targetOriginalId: string | undefined,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-comments", teamId, targetType, targetOriginalId],
    queryFn: async () => {
      if (!teamId || !targetOriginalId) return [];
      const token = await getToken();
      return getTeamComments(
        teamId,
        targetType,
        targetOriginalId,
        token || undefined,
      );
    },
    enabled: !!teamId && !!targetOriginalId,
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
  });
}

export function useCreateTeamComment(teamId: number | undefined) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      if (!teamId) throw new Error("Team ID is required");
      const token = await getToken();
      return createTeamComment(teamId, input, token || undefined);
    },
    onSuccess: (_, variables) => {
      // コメント一覧を再取得
      queryClient.invalidateQueries({
        queryKey: [
          "team-comments",
          teamId,
          variables.targetType,
          variables.targetOriginalId,
        ],
      });
    },
  });
}

export function useUpdateTeamComment(
  teamId: number | undefined,
  targetType: "memo" | "task" | "board",
  targetOriginalId: string | undefined,
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => {
      const token = await getToken();
      return updateTeamComment(commentId, { content }, token || undefined);
    },
    onSuccess: () => {
      // コメント一覧を再取得
      queryClient.invalidateQueries({
        queryKey: ["team-comments", teamId, targetType, targetOriginalId],
      });
    },
  });
}

export function useDeleteTeamComment(
  teamId: number | undefined,
  targetType: "memo" | "task" | "board",
  targetOriginalId: string | undefined,
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: number) => {
      const token = await getToken();
      return deleteTeamComment(commentId, token || undefined);
    },
    onSuccess: () => {
      // コメント一覧を再取得
      queryClient.invalidateQueries({
        queryKey: ["team-comments", teamId, targetType, targetOriginalId],
      });
    },
  });
}

// すべてのボードのコメント取得用フック
export function useAllTeamBoardComments(teamId: number | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-all-board-comments", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const token = await getToken();
      return getAllTeamBoardComments(teamId, token || undefined);
    },
    enabled: !!teamId,
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
  });
}

// ボード内アイテムのコメント取得用フック
export function useBoardItemComments(
  teamId: number | undefined,
  boardId: number | undefined,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["board-item-comments", teamId, boardId],
    queryFn: async () => {
      if (!teamId || !boardId) return [];
      const token = await getToken();
      return getBoardItemComments(teamId, boardId, token || undefined);
    },
    enabled: !!teamId && !!boardId,
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
  });
}
