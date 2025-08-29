import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

export interface UserInfo {
  userId: string;
  planType: "free" | "premium";
  createdAt: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export function useUser() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("ユーザー情報の取得に失敗しました");
      }

      const data: UserInfo = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    cacheTime: 30 * 60 * 1000, // 30分間キャッシュを保持
  });
}
