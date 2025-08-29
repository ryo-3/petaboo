import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

interface UserInfo {
  userId: string;
  displayName: string | null;
  planType: "free" | "premium";
  createdAt: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export function useUserInfo() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["user-info"],
    queryFn: async (): Promise<UserInfo> => {
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

      return response.json();
    },
  });
}
