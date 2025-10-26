import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

export interface TeamActivity {
  id: number;
  userId: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  targetTitle: string | null;
  metadata: string | null;
  createdAt: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export function useTeamActivities(customUrl: string, limit: number = 20) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-activities", customUrl, limit],
    queryFn: async (): Promise<TeamActivity[]> => {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/teams/${customUrl}/activities?limit=${limit}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("アクティビティの取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!customUrl,
    staleTime: 30 * 1000, // 30秒間は新鮮なデータとして扱う
    refetchOnWindowFocus: false,
  });
}
