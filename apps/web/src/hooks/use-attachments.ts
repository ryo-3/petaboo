import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Attachment {
  id: number;
  teamId: number;
  userId: string;
  attachedTo: "memo" | "task" | "comment";
  attachedDisplayId: string;
  displayId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  r2Key: string;
  url: string;
  createdAt: number;
  deletedAt: number | null;
}

/**
 * 添付ファイル一覧取得（個人・チーム両対応）
 */
export function useAttachments(
  teamId: number | undefined,
  attachedTo: "memo" | "task" | "comment",
  attachedDisplayId: string | undefined,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["attachments", teamId, attachedTo, attachedDisplayId],
    queryFn: async (): Promise<Attachment[]> => {
      if (!attachedDisplayId) return [];

      const token = await getToken();
      const url = teamId
        ? `${API_URL}/attachments?teamId=${teamId}&attachedTo=${attachedTo}&attachedDisplayId=${attachedDisplayId}`
        : `${API_URL}/attachments?attachedTo=${attachedTo}&attachedDisplayId=${attachedDisplayId}`;

      console.log("📎 [添付ファイル取得]", {
        attachedTo,
        attachedDisplayId,
        url,
      });

      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("添付ファイルの取得に失敗しました");
      }

      const attachments = await response.json();
      console.log("📎 [添付ファイル取得結果]", {
        attachedTo,
        attachedDisplayId,
        count: attachments.length,
        files: attachments.map((a: Attachment) => ({
          id: a.id,
          fileName: a.fileName,
          attachedDisplayId: a.attachedDisplayId,
        })),
      });

      return attachments;
    },
    enabled: !!attachedDisplayId,
  });
}

/**
 * 画像アップロード
 */
export function useUploadAttachment(
  teamId: number | undefined,
  attachedTo: "memo" | "task" | "comment",
  attachedDisplayId: string | undefined,
) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<Attachment> => {
      if (!attachedDisplayId) {
        throw new Error("アイテムIDが指定されていません");
      }

      // ファイルサイズチェック（5MB）
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("ファイルサイズは5MB以下にしてください");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("attachedTo", attachedTo);
      formData.append("attachedDisplayId", attachedDisplayId);

      const token = await getToken();
      const url = teamId
        ? `${API_URL}/attachments/upload?teamId=${teamId}`
        : `${API_URL}/attachments/upload`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "画像のアップロードに失敗しました");
      }

      return response.json();
    },
    // onSuccessは削除（use-attachment-manager.tsで一括管理）
  });
}

/**
 * 添付ファイル削除（個人・チーム両対応）
 */
export function useDeleteAttachment(teamId: number | undefined) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (attachmentId: number): Promise<void> => {
      const token = await getToken();
      const url = teamId
        ? `${API_URL}/attachments/${attachmentId}?teamId=${teamId}`
        : `${API_URL}/attachments/${attachmentId}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "画像の削除に失敗しました");
      }
    },
    // onSuccessは削除（use-attachment-manager.tsで一括管理）
  });
}
