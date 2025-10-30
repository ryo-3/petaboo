import { useState, useCallback } from "react";
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/src/hooks/use-attachments";
import { useToast } from "@/src/contexts/toast-context";
import { OriginalIdUtils } from "@/src/types/common";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

interface UseAttachmentManagerOptions {
  itemType: "memo" | "task";
  item?: { id: number; originalId?: string } | null;
  teamMode: boolean;
  teamId?: number;
  isDeleted: boolean;
}

/**
 * 画像添付の共通ロジックを管理するフック
 * memo-editor.tsx と task-editor.tsx で共通化
 */
export const useAttachmentManager = ({
  itemType,
  item,
  teamMode,
  teamId,
  isDeleted,
}: UseAttachmentManagerOptions) => {
  const { showToast, removeToast } = useToast();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // originalIdを取得
  const originalId = item ? OriginalIdUtils.fromItem(item) : undefined;

  // 画像添付API
  const { data: attachments = [] } = useAttachments(
    teamMode ? teamId : undefined,
    itemType,
    originalId,
  );

  const uploadMutation = useUploadAttachment(
    teamMode ? teamId : undefined,
    itemType,
    originalId,
  );

  const deleteMutation = useDeleteAttachment(
    teamMode ? teamId : undefined,
    itemType,
    originalId,
  );

  // 保存待ちの画像（ローカルstate）
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  // 削除予定の画像ID（保存時に削除）
  const [pendingDeletes, setPendingDeletes] = useState<number[]>([]);
  // アップロード・削除処理中フラグ
  const [isProcessing, setIsProcessing] = useState(false);

  // ファイル形式バリデーション（画像 + PDF等）
  const validateImageFile = useCallback(
    (file: File): boolean => {
      // MIMEタイプチェック
      const allowedTypes = [
        // 画像
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        // ファイル
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
      ];

      if (!allowedTypes.includes(file.type)) {
        showToast(`対応していないファイル形式です（${file.type}）`, "error");
        return false;
      }

      // ファイルサイズチェック（画像5MB、その他20MB）
      const isImage = file.type.startsWith("image/");
      const maxSize = isImage ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxMB = maxSize / 1024 / 1024;
        showToast(`ファイルサイズは${maxMB}MB以下にしてください`, "error");
        return false;
      }

      return true;
    },
    [showToast],
  );

  // ファイル選択ハンドラー（単一）
  const handleFileSelect = useCallback(
    (file: File) => {
      // バリデーション
      if (!validateImageFile(file)) {
        return;
      }

      const totalCount =
        attachments.filter((a) => !pendingDeletes.includes(a.id)).length +
        pendingImages.length;

      if (totalCount >= 10) {
        showToast("画像は最大10枚までです", "error");
        return;
      }

      setPendingImages((prev) => [...prev, file]);
    },
    [
      validateImageFile,
      attachments,
      pendingDeletes,
      pendingImages.length,
      showToast,
    ],
  );

  // ファイル選択ハンドラー（複数）
  const handleFilesSelect = useCallback(
    (files: File[]) => {
      const currentCount =
        attachments.filter((a) => !pendingDeletes.includes(a.id)).length +
        pendingImages.length;

      const validFiles: File[] = [];

      for (const file of files) {
        // 上限チェック
        if (currentCount + validFiles.length >= 10) {
          showToast("画像は最大10枚までです", "error");
          break;
        }

        // バリデーション
        if (validateImageFile(file)) {
          validFiles.push(file);
        }
      }

      if (validFiles.length > 0) {
        setPendingImages((prev) => [...prev, ...validFiles]);
      }
    },
    [
      validateImageFile,
      attachments,
      pendingDeletes,
      pendingImages.length,
      showToast,
    ],
  );

  // クリップボードからの画像ペースト処理
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (isDeleted) return; // 削除済みの場合は無効

      const items = e.clipboardData?.items;
      if (!items) return;

      // クリップボード内の画像を探す
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith("image/")) {
          e.preventDefault(); // デフォルトのペースト動作を防止

          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
          }
          break; // 最初の画像のみ処理
        }
      }
    },
    [isDeleted, handleFileSelect],
  );

  // 既存画像削除（保存時に削除される）
  const handleDeleteAttachment = useCallback((attachmentId: number) => {
    setPendingDeletes((prev) => [...prev, attachmentId]);
  }, []);

  // 保存待ち画像削除
  const handleDeletePendingImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 削除予定から復元
  const handleRestoreAttachment = useCallback((attachmentId: number) => {
    setPendingDeletes((prev) => prev.filter((id) => id !== attachmentId));
  }, []);

  // 保存待ち画像を一括アップロード
  const uploadPendingImages = useCallback(
    async (targetOriginalId?: string) => {
      if (pendingImages.length === 0) return { success: true, failedCount: 0 };

      setIsProcessing(true);

      try {
        // アップロード開始通知（IDを取得）
        const count = pendingImages.length;
        const startTime = Date.now();

        // アップロード中トーストを表示（自動消去なし）
        const uploadingToastId = showToast(
          `画像を${count}枚アップロード中...`,
          "info",
          0,
        );

        const results = await Promise.allSettled(
          pendingImages.map(async (file) => {
            // targetOriginalIdが指定されている場合は、直接fetch APIを使用（新規作成時）
            if (targetOriginalId && targetOriginalId !== originalId) {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("attachedTo", itemType);
              formData.append("attachedOriginalId", targetOriginalId);

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
                throw new Error(
                  error.error || "画像のアップロードに失敗しました",
                );
              }

              return response.json();
            }
            // 通常のアップロード（既存アイテム）
            return uploadMutation.mutateAsync(file);
          }),
        );

        const failedCount = results.filter(
          (r) => r.status === "rejected",
        ).length;

        // アップロード完了後すぐにpendingImagesをクリア（二重表示を防ぐ）
        setPendingImages([]);

        // 最低3秒表示を保証
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, 3000 - elapsed);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        // アップロード中トーストを削除
        removeToast(uploadingToastId);

        // 完了トーストを表示
        if (failedCount > 0) {
          showToast(
            `${failedCount}枚の画像アップロードに失敗しました`,
            "error",
          );
        } else {
          showToast("画像のアップロードが完了しました", "success", 3000);
        }

        // キャッシュを更新（targetOriginalId使用時）
        if (targetOriginalId && failedCount === 0) {
          queryClient.invalidateQueries({
            queryKey: ["attachments", teamId, itemType, targetOriginalId],
          });
        }

        return { success: failedCount === 0, failedCount };
      } finally {
        setIsProcessing(false);
      }
    },
    [
      pendingImages,
      uploadMutation,
      showToast,
      removeToast,
      itemType,
      originalId,
      teamId,
      getToken,
      queryClient,
    ],
  );

  // 削除予定画像を一括削除
  const deletePendingAttachments = useCallback(async () => {
    if (pendingDeletes.length === 0) return { success: true, failedCount: 0 };

    setIsProcessing(true);

    try {
      // 削除開始通知（IDを取得）
      const count = pendingDeletes.length;
      const startTime = Date.now();

      // 削除中トーストを表示（自動消去なし）
      const deletingToastId = showToast(`画像を${count}枚削除中...`, "info", 0);

      const results = await Promise.allSettled(
        pendingDeletes.map((id) => deleteMutation.mutateAsync(id)),
      );

      const failedCount = results.filter((r) => r.status === "rejected").length;

      // 削除完了後すぐにpendingDeletesをクリア（削除予定表示を即座に解除）
      setPendingDeletes([]);

      // 最低3秒表示を保証
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);
      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      // 削除中トーストを削除
      removeToast(deletingToastId);

      // 完了トーストを表示
      if (failedCount > 0) {
        showToast(`${failedCount}枚の画像削除に失敗しました`, "error");
      } else {
        showToast("画像の削除が完了しました", "success", 3000);
      }

      return { success: failedCount === 0, failedCount };
    } finally {
      setIsProcessing(false);
    }
  }, [pendingDeletes, deleteMutation, showToast, removeToast]);

  // 保存待ち・削除予定をリセット
  const resetPending = useCallback(() => {
    setPendingImages([]);
    setPendingDeletes([]);
  }, []);

  return {
    // データ
    attachments,
    pendingImages,
    pendingDeletes,

    // ハンドラー
    handleFileSelect,
    handleFilesSelect,
    handlePaste,
    handleDeleteAttachment,
    handleDeletePendingImage,
    handleRestoreAttachment,

    // 一括処理
    uploadPendingImages,
    deletePendingAttachments,
    resetPending,

    // ローディング状態
    isUploading: isProcessing || uploadMutation.isPending,
    isDeleting: isProcessing || deleteMutation.isPending,
  };
};
