import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface GenerateInviteCodeRequest {
  customUrl: string;
  expiresInDays?: number;
  // roleは常にmemberに固定（API側で制御）
}

export interface InviteUrl {
  token: string;
  url: string;
  expiresAt: string;
  createdAt: string;
}

// 既存の招待URL取得フック
export function useGetInviteUrl(customUrl: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["inviteUrl", customUrl],
    queryFn: async (): Promise<InviteUrl | null> => {
      // customUrlが無効な値の場合はnullを返す
      if (!customUrl || customUrl === "undefined" || customUrl === "null") {
        return null;
      }

      const token = await getToken();

      const response = await fetch(`${API_URL}/teams/${customUrl}/invite-url`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("認証が必要です");
        }
        // 404の場合は招待URLが存在しないので正常な状態
        if (response.status === 404) {
          return null;
        }
        // 403の場合は権限がないので、nullを返す（エラーにしない）
        if (response.status === 403) {
          return null;
        }
        throw new Error("招待URLの取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!customUrl && customUrl !== "undefined" && customUrl !== "null",
    // グローバル設定を使用（staleTime: 30分、refetchOnMount: false）
  });
}

// 招待URL削除フック
export function useDeleteInviteUrl() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (customUrl: string) => {
      const token = await getToken();

      const response = await fetch(`${API_URL}/teams/${customUrl}/invite-url`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "招待URLの削除に失敗しました");
      }

      return response.json();
    },
    onSuccess: (_data, customUrl) => {
      // 招待URL情報をリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["inviteUrl", customUrl],
      });
    },
  });
}

export function useGenerateInviteCode() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      customUrl,
      expiresInDays = 3,
    }: GenerateInviteCodeRequest) => {
      const token = await getToken();

      const response = await fetch(`${API_URL}/teams/${customUrl}/invite-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expiresInDays,
          // roleは常にmemberで固定（API側で制御）
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("API Error:", error);
        throw new Error(
          error.error || error.message || "招待コードの生成に失敗しました",
        );
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      // 招待URL情報をリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["inviteUrl", variables.customUrl],
      });

      // チーム詳細をリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["team", variables.customUrl],
      });

      // チーム一覧もリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["teams"],
      });
    },
  });
}
