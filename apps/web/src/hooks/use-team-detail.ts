import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface TeamDetail {
  id: number;
  name: string;
  description?: string;
  role: "admin" | "member";
  createdAt: number;
  updatedAt: number;
  memberCount: number;
}

export function useTeamDetail(teamId: number) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team", teamId],
    queryFn: async (): Promise<TeamDetail> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/${teamId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("チーム詳細の取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!teamId,
  });
}