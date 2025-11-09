import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { Attachment } from "@/src/hooks/use-attachments";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * 全メモまたはタスクの添付ファイルを一括取得するフック
 * カード一覧表示でサムネイル表示のために使用
 */
export function useAllAttachments(
  teamId: number | undefined,
  attachedTo: "memo" | "task",
  enabled: boolean = true,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["all-attachments", teamId, attachedTo],
    queryFn: async (): Promise<Attachment[]> => {
      const token = await getToken();
      const url = teamId
        ? `${API_URL}/attachments/all?teamId=${teamId}&attachedTo=${attachedTo}`
        : `${API_URL}/attachments/all?attachedTo=${attachedTo}`;

      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("添付ファイルの取得に失敗しました");
      }

      const data = await response.json();
      return data;
    },
    enabled,
  });
}
