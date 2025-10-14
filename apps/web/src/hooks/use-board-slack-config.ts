import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface BoardSlackConfig {
  id: number;
  boardId: number;
  webhookUrl: string;
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface BoardSlackConfigInput {
  webhookUrl: string;
  isEnabled: boolean;
}

/**
 * ボードSlack設定取得
 */
export function useBoardSlackConfig(boardId: number | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["board-slack-config", boardId],
    queryFn: async (): Promise<BoardSlackConfig | null> => {
      if (!boardId) return null;

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/boards/${boardId}/slack-config`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (response.status === 404) {
        return null; // 設定未登録
      }

      if (!response.ok) {
        throw new Error("Slack設定の取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!boardId,
  });
}

/**
 * ボードSlack設定保存（登録・更新）
 */
export function useSaveBoardSlackConfig(boardId: number | undefined) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: BoardSlackConfigInput,
    ): Promise<BoardSlackConfig> => {
      if (!boardId) throw new Error("ボードIDが指定されていません");

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/boards/${boardId}/slack-config`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Slack設定の保存に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["board-slack-config", boardId],
      });
    },
  });
}

/**
 * ボードSlack設定削除
 */
export function useDeleteBoardSlackConfig(boardId: number | undefined) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!boardId) throw new Error("ボードIDが指定されていません");

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/boards/${boardId}/slack-config`,
        {
          method: "DELETE",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Slack設定の削除に失敗しました");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["board-slack-config", boardId],
      });
    },
  });
}

/**
 * ボードSlackテスト通知送信
 */
export function useTestBoardSlackNotification(boardId: number | undefined) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      if (!boardId) throw new Error("ボードIDが指定されていません");

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/boards/${boardId}/slack-config/test`,
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
