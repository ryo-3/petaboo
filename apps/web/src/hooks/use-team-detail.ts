import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface TeamMember {
  userId: string;
  displayName: string | null;
  role: "admin" | "member";
  joinedAt: number;
}

export interface TeamDetail {
  id: number;
  name: string;
  description?: string;
  customUrl: string;
  role: "admin" | "member";
  createdAt: number;
  updatedAt: number;
  memberCount: number;
  members: TeamMember[];
}

export function useTeamDetail(customUrl: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team", customUrl],
    queryFn: async (): Promise<TeamDetail> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/${customUrl}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // 404は正常な動作（チームが存在しない）なのでサイレントに処理
          throw new Error("TEAM_NOT_FOUND");
        }
        throw new Error("チーム詳細の取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!customUrl,
    retry: (failureCount, error) => {
      // 404エラーの場合はリトライしない
      if (error instanceof Error && error.message === "TEAM_NOT_FOUND") {
        return false;
      }
      // その他のエラーは最大3回リトライ
      return failureCount < 3;
    },
  });
}
