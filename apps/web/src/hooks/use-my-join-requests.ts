import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = "http://localhost:7594";

interface MyJoinRequest {
  id: number;
  teamName: string;
  teamCustomUrl: string;
  displayName: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  processedAt: number | null;
  message: string | null;
}

interface MyJoinRequestsResponse {
  requests: MyJoinRequest[];
}

export function useMyJoinRequests() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["my-join-requests"],
    queryFn: async (): Promise<MyJoinRequestsResponse> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/my-requests`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("申請状況の取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!getToken,
  });
}
