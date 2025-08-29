import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Team {
  id: number;
  name: string;
  description?: string;
  customUrl: string;
  createdAt: string;
  updatedAt: string;
  role: "admin" | "member";
  memberCount?: number;
  inviteCode?: string;
}

export function useTeams() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("チーム一覧の取得に失敗しました");
      }

      const data = await response.json();
      // APIが { teams: [...] } 形式で返している場合の対応
      return Array.isArray(data) ? data : data.teams || [];
    },
  });
}