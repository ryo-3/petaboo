import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface SlackConfig {
  id: number;
  teamId: number;
  webhookUrl: string;
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SlackConfigInput {
  webhookUrl: string;
  isEnabled: boolean;
}

/**
 * Slack設定取得
 */
export function useTeamSlackConfig(teamId: number | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-slack-config", teamId],
    queryFn: async (): Promise<SlackConfig | null> => {
      if (!teamId) return null;

      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/${teamId}/slack-config`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.status === 404) {
        return null; // 設定未登録
      }

      if (!response.ok) {
        throw new Error("Slack設定の取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!teamId,
  });
}

/**
 * Slack設定保存（登録・更新）
 */
export function useSaveTeamSlackConfig(teamId: number | undefined) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SlackConfigInput): Promise<SlackConfig> => {
      if (!teamId) throw new Error("チームIDが指定されていません");

      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/${teamId}/slack-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Slack設定の保存に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["team-slack-config", teamId],
      });
    },
  });
}

/**
 * Slack設定削除
 */
export function useDeleteTeamSlackConfig(teamId: number | undefined) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!teamId) throw new Error("チームIDが指定されていません");

      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/${teamId}/slack-config`, {
        method: "DELETE",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Slack設定の削除に失敗しました");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["team-slack-config", teamId],
      });
    },
  });
}

/**
 * テスト通知送信
 */
export function useTestSlackNotification(teamId: number | undefined) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      if (!teamId) throw new Error("チームIDが指定されていません");

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/teams/${teamId}/slack-config/test`,
        {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "テスト通知の送信に失敗しました");
      }

      return response.json();
    },
  });
}
