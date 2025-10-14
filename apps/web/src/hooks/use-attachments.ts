import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Attachment {
  id: number;
  teamId: number;
  userId: string;
  attachedTo: "memo" | "task" | "comment";
  attachedOriginalId: string;
  originalId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  r2Key: string;
  url: string;
  createdAt: number;
  deletedAt: number | null;
}

/**
 * 添付ファイル一覧取得
 */
export function useAttachments(
  teamId: number | undefined,
  attachedTo: "memo" | "task" | "comment",
  attachedOriginalId: string | undefined,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["attachments", teamId, attachedTo, attachedOriginalId],
    queryFn: async (): Promise<Attachment[]> => {
      if (!teamId || !attachedOriginalId) return [];

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/attachments?teamId=${teamId}&attachedTo=${attachedTo}&attachedOriginalId=${attachedOriginalId}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("添付ファイルの取得に失敗しました");
      }

      return response.json();
    },
    enabled: !!teamId && !!attachedOriginalId,
  });
}

/**
 * 画像アップロード
 */
export function useUploadAttachment(
  teamId: number | undefined,
  attachedTo: "memo" | "task" | "comment",
  attachedOriginalId: string | undefined,
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<Attachment> => {
      if (!teamId || !attachedOriginalId) {
        throw new Error("チームIDまたはアイテムIDが指定されていません");
      }

      // ファイルサイズチェック（5MB）
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("ファイルサイズは5MB以下にしてください");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("attachedTo", attachedTo);
      formData.append("attachedOriginalId", attachedOriginalId);

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/attachments/upload?teamId=${teamId}`,
        {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "画像のアップロードに失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", teamId, attachedTo, attachedOriginalId],
      });
    },
  });
}

/**
 * 添付ファイル削除
 */
export function useDeleteAttachment(
  teamId: number | undefined,
  attachedTo: "memo" | "task" | "comment",
  attachedOriginalId: string | undefined,
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: number): Promise<void> => {
      if (!teamId) throw new Error("チームIDが指定されていません");

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/attachments/${attachmentId}?teamId=${teamId}`,
        {
          method: "DELETE",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "画像の削除に失敗しました");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", teamId, attachedTo, attachedOriginalId],
      });
    },
  });
}
