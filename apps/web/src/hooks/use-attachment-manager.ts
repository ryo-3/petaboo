import { useState, useCallback, useRef } from "react";
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/src/hooks/use-attachments";
import type { Attachment } from "@/src/hooks/use-attachments";
import { useToast } from "@/src/contexts/toast-context";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import {
  validateFile,
  MAX_ATTACHMENTS_PER_ITEM,
} from "@/src/utils/file-validator";
import { compressImage, formatBytes } from "@/src/utils/image-compressor";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

interface UseAttachmentManagerOptions {
  itemType: "memo" | "task";
  item?: { id: number; displayId?: string } | null;
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

  // displayIdを取得（個人・チーム共通）
  const displayId = item?.displayId;

  // 画像添付API
  const { data: attachments = [] } = useAttachments(
    teamMode ? teamId : undefined,
    itemType,
    displayId,
  );

  const uploadMutation = useUploadAttachment(
    teamMode ? teamId : undefined,
    itemType,
    displayId,
  );

  const deleteMutation = useDeleteAttachment(teamMode ? teamId : undefined);

  // 保存待ちの画像（ローカルstate）
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  // 削除予定の画像ID（保存時に削除）
  const [pendingDeletes, setPendingDeletes] = useState<number[]>([]);
  // アップロード・削除処理中フラグ
  const [isProcessing, setIsProcessing] = useState(false);

  // 最新の値をrefで保持（レンダリング時に同期、useEffectは使わない）
  const attachmentsRef = useRef(attachments);
  const pendingDeletesRef = useRef(pendingDeletes);

  // デバッグログ: 取得した画像情報
  console.log("🖼️ [useAttachmentManager] 画像取得", {
    teamMode,
    teamId,
    itemType,
    displayId,
    itemId: item?.id,
    attachmentsCount: attachments.length,
    pendingImagesCount: pendingImages.length,
    pendingImageNames: pendingImages.map((f) => f.name),
    attachments: attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      teamId: a.teamId,
      attachedDisplayId: a.attachedDisplayId,
    })),
  });

  // レンダリング時にrefを同期（useEffectを使わない）
  attachmentsRef.current = attachments;
  pendingDeletesRef.current = pendingDeletes;

  // ファイル処理（バリデーション + 圧縮）
  const processFile = useCallback(
    async (file: File): Promise<{ success: boolean; file?: File }> => {
      // バリデーション
      const validation = validateFile(file);
      if (!validation.valid) {
        showToast(validation.error!, "error");
        return { success: false };
      }

      // 圧縮が必要な場合
      if (validation.needsCompression) {
        try {
          const result = await compressImage(file);
          if (result.wasCompressed) {
            const saved = formatBytes(
              result.originalSize - result.compressedSize,
            );
            showToast(`画像を圧縮しました（${saved}削減）`, "info", 3000);
          }
          // 圧縮後も5MB超の場合はエラー
          if (result.file.size > 5 * 1024 * 1024) {
            showToast("圧縮後も5MB以下にできませんでした", "error");
            return { success: false };
          }
          return { success: true, file: result.file };
        } catch (error) {
          console.error("画像圧縮エラー:", error);
          showToast("画像の圧縮に失敗しました", "error");
          return { success: false };
        }
      }

      return { success: true, file };
    },
    [showToast],
  );

  // ファイル選択ハンドラー（単一）
  const handleFileSelect = useCallback(
    async (file: File) => {
      // 上限チェック
      const currentCount =
        attachmentsRef.current.filter(
          (a) => !pendingDeletesRef.current.includes(a.id),
        ).length + pendingImages.length;

      if (currentCount >= MAX_ATTACHMENTS_PER_ITEM) {
        showToast(
          `ファイルは最大${MAX_ATTACHMENTS_PER_ITEM}個までです`,
          "error",
        );
        return;
      }

      // バリデーション + 圧縮
      const result = await processFile(file);
      if (!result.success || !result.file) {
        return;
      }

      setPendingImages((prev) => [...prev, result.file!]);
    },
    [processFile, showToast, pendingImages.length],
  );

  // ファイル選択ハンドラー（複数）
  const handleFilesSelect = useCallback(
    async (files: File[]) => {
      const currentCount =
        attachmentsRef.current.filter(
          (a) => !pendingDeletesRef.current.includes(a.id),
        ).length + pendingImages.length;

      const processedFiles: File[] = [];

      for (const file of files) {
        // 上限チェック
        if (currentCount + processedFiles.length >= MAX_ATTACHMENTS_PER_ITEM) {
          showToast(
            `ファイルは最大${MAX_ATTACHMENTS_PER_ITEM}個までです`,
            "error",
          );
          break;
        }

        // バリデーション + 圧縮
        const result = await processFile(file);
        if (result.success && result.file) {
          processedFiles.push(result.file);
        }
      }

      if (processedFiles.length > 0) {
        setPendingImages((prev) => [...prev, ...processedFiles]);
      }
    },
    [processFile, showToast, pendingImages.length],
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
    async (targetDisplayId?: string) => {
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

        // 🔍 アップロード前のファイル情報をログ出力
        console.log("🖼️ [uploadPendingImages] アップロード開始", {
          teamMode,
          teamId,
          itemType,
          targetDisplayId,
          displayId,
          filesCount: pendingImages.length,
          files: pendingImages.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        });

        const results = await Promise.allSettled(
          pendingImages.map(async (file, index) => {
            console.log(
              `🖼️ [uploadPendingImages] ファイル${index + 1}/${pendingImages.length} アップロード中`,
              {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                targetDisplayId,
                teamMode,
                teamId,
              },
            );

            // targetDisplayIdが指定されている場合は、直接fetch APIを使用（新規作成時）
            if (targetDisplayId && targetDisplayId !== displayId) {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("attachedTo", itemType);
              formData.append("attachedDisplayId", targetDisplayId);

              const token = await getToken();
              // 個人モードの場合はteamIdをクエリパラメータに含めない
              const uploadUrl =
                teamMode && teamId
                  ? `${API_URL}/attachments/upload?teamId=${teamId}`
                  : `${API_URL}/attachments/upload`;

              console.log(`🖼️ [uploadPendingImages] POST ${uploadUrl}`, {
                fileName: file.name,
                attachedTo: itemType,
                attachedDisplayId: targetDisplayId,
              });

              const response = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: formData,
              });

              if (!response.ok) {
                const error = await response.json();
                console.error("🖼️ [uploadPendingImages] アップロード失敗", {
                  fileName: file.name,
                  status: response.status,
                  error,
                });
                throw new Error(
                  error.error || "画像のアップロードに失敗しました",
                );
              }

              const result = await response.json();
              console.log(
                `🖼️ [uploadPendingImages] ファイル${index + 1} アップロード成功`,
                {
                  fileName: file.name,
                  attachmentId: result.id,
                  attachmentDisplayId: result.displayId,
                  url: result.url,
                },
              );
              return result;
            }
            // 通常のアップロード（既存アイテム）
            return uploadMutation.mutateAsync(file);
          }),
        );

        const successfulAttachments: Attachment[] = [];
        const failedCount = results.filter((r) => {
          if (r.status === "fulfilled") {
            const attachment = r.value as Attachment;
            if (attachment && attachment.id !== undefined) {
              successfulAttachments.push(attachment);
            }
            return false;
          }
          return true;
        }).length;

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

        // キャッシュを更新（targetDisplayId使用時）
        if (failedCount === 0) {
          // 先にpendingImagesをクリア（重複表示防止）
          console.log("🖼️ [useAttachmentManager] pendingImagesクリア前");
          setPendingImages([]);
          console.log("🖼️ [useAttachmentManager] pendingImagesクリア完了");

          if (targetDisplayId) {
            const queryKey = [
              "attachments",
              teamId,
              itemType,
              displayId,
            ] as const;

            console.log("🖼️ [useAttachmentManager] キャッシュinvalidate開始", {
              queryKey,
            });
            // pendingImagesクリア後にリフェッチ
            await queryClient.invalidateQueries({ queryKey });
            console.log("🖼️ [useAttachmentManager] キャッシュinvalidate完了");
          }
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
      displayId,
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

      // 削除完了後、キャッシュを更新
      if (failedCount === 0 && displayId) {
        const queryKey = ["attachments", teamId, itemType, displayId] as const;
        await queryClient.invalidateQueries({ queryKey });
      }

      return { success: failedCount === 0, failedCount };
    } finally {
      setIsProcessing(false);
    }
  }, [
    pendingDeletes,
    deleteMutation,
    showToast,
    removeToast,
    displayId,
    teamId,
    itemType,
    queryClient,
  ]);

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
