import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  getTeamComments,
  createTeamComment,
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
