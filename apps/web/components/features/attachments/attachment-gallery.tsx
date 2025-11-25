import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/src/contexts/toast-context";
import type { Attachment } from "@/src/hooks/use-attachments";
import ImagePreviewModal from "@/components/ui/modals/image-preview-modal";

interface AttachmentGalleryProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: number) => void;
  isDeleting?: boolean;
  pendingImages?: File[]; // 保存待ちの画像
  onDeletePending?: (index: number) => void; // 保存待ち画像の削除
  pendingDeletes?: number[]; // 削除予定の画像ID
  onRestore?: (attachmentId: number) => void; // 削除予定から復元
  isUploading?: boolean; // アップロード中
}

export default function AttachmentGallery({
  attachments,
  onDelete,
  isDeleting = false,
  pendingImages = [],
  onDeletePending,
  pendingDeletes = [],
  onRestore,
  isUploading = false,
}: AttachmentGalleryProps) {
  const { userId, getToken } = useAuth();
  const { showToast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const loadedIdsRef = useRef<Set<number>>(new Set());

  // PDFや他のファイルを認証付きで開く
  const handleFileOpen = async (attachment: Attachment) => {
    try {
      const token = await getToken();
      const response = await fetch(attachment.url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error("ファイルの読み込みに失敗しました");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // 新しいタブで開く
      window.open(url, "_blank");

      // 一定時間後にメモリ解放
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("ファイル読み込みエラー:", error);
      showToast("ファイルを開けませんでした", "error");
    }
  };

  // attachments配列の安定化（IDリストが同じなら同じ配列を返す）
  const attachmentIdsString = attachments.map((a) => a.id).join(",");
  const stableAttachments = useMemo(() => attachments, [attachmentIdsString]);

  // attachments IDリストをメモ化（依存配列用）
  const attachmentIds = useMemo(
    () => stableAttachments.map((a) => a.id).join(","),
    [stableAttachments],
  );

  // 画像URL読み込み（IDベースの変更検知）
  useEffect(() => {
    const currentIds = new Set(stableAttachments.map((a) => a.id));
    const loadedIds = loadedIdsRef.current;

    // 新しい画像のみ読み込み
    const newAttachments = stableAttachments.filter(
      (a) => !loadedIds.has(a.id) && a.mimeType.startsWith("image/"),
    );

    // 削除された画像のURLをクリーンアップ
    const removedIds = Array.from(loadedIds).filter(
      (id) => !currentIds.has(id),
    );
    if (removedIds.length > 0) {
      setImageUrls((prev) => {
        const next = { ...prev };
        removedIds.forEach((id) => {
          const url = next[id];
          if (url) URL.revokeObjectURL(url);
          delete next[id];
          loadedIds.delete(id);
        });
        return next;
      });
    }

    // 新しい画像を非同期で読み込み
    if (newAttachments.length > 0) {
      newAttachments.forEach(async (attachment) => {
        try {
          const token = await getToken();
          const response = await fetch(attachment.url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (!response.ok) {
            // fetch失敗時はloadedIdsに追加して再試行を防ぐ
            loadedIds.add(attachment.id);
            return;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          setImageUrls((prev) => ({ ...prev, [attachment.id]: url }));
          loadedIds.add(attachment.id);
        } catch (error) {
          console.error("画像読み込みエラー:", error);
          // エラー時もloadedIdsに追加して再試行を防ぐ
          loadedIds.add(attachment.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentIds]);

  // pendingImagesの安定化（ファイル名とサイズでキーを生成）
  const pendingImagesKey = useMemo(
    () => pendingImages.map((f) => `${f.name}-${f.size}`).join(","),
    [pendingImages],
  );

  // 保存待ち画像のプレビューURL生成（既にattachmentsに存在するものを除外）
  useEffect(() => {
    // アップロード中は除外処理をスキップ（楽観的UIを維持）
    if (isUploading) {
      // アップロード中は現在のpendingImagesをそのまま表示
      const urls = pendingImages.map((file) => URL.createObjectURL(file));
      setPendingUrls(urls);

      return () => {
        urls.forEach((url) => URL.revokeObjectURL(url));
      };
    }

    // 通常時：attachmentsに既に存在するファイル名とサイズのセット
    const existingFiles = new Set(
      attachments.map((a) => `${a.fileName}-${a.fileSize}`),
    );

    // pendingImagesから重複を除外
    const filteredPendingImages = pendingImages.filter(
      (file) => !existingFiles.has(`${file.name}-${file.size}`),
    );

    const urls = filteredPendingImages.map((file) => URL.createObjectURL(file));
    setPendingUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingImagesKey, attachmentIds, isUploading]);

  if (attachments.length === 0 && pendingImages.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:flex-wrap gap-2 mt-3 px-2">
        {/* 既存の画像・ファイル */}
        {attachments.map((attachment) => {
          const imageUrl = imageUrls[attachment.id];
          const isMarkedForDelete = pendingDeletes.includes(attachment.id);
          const isImage = attachment.mimeType.startsWith("image/");
          const isPdf = attachment.mimeType === "application/pdf";
          const isProcessing = isUploading || isDeleting;

          return (
            <div key={attachment.id} className="relative group">
              <div className="relative">
                {isImage ? (
                  imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={attachment.fileName}
                      className={`w-full md:w-32 h-auto md:h-32 md:object-cover rounded-lg ${
                        isProcessing
                          ? "opacity-50 cursor-default"
                          : isMarkedForDelete
                            ? "opacity-50 border-2 border-red-400 cursor-pointer hover:opacity-80 transition-opacity"
                            : "cursor-pointer hover:opacity-80 transition-opacity"
                      }`}
                      onClick={() =>
                        !isProcessing && setSelectedImage(imageUrl)
                      }
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-500">読込中...</span>
                    </div>
                  )
                ) : isPdf ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => !isProcessing && handleFileOpen(attachment)}
                    className={`w-32 h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 ${
                      isProcessing
                        ? "opacity-50 cursor-default"
                        : isMarkedForDelete
                          ? "opacity-50 border-2 border-red-400 hover:bg-gray-200 transition-colors"
                          : "hover:bg-gray-200 transition-colors"
                    }`}
                  >
                    <svg
                      className="w-12 h-12 text-red-500 mb-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 18v-1h8v1H8zm0-4v-1h8v1H8zm0-4v-1h5v1H8z" />
                    </svg>
                    <p className="text-[10px] text-gray-600 text-center truncate w-full">
                      {attachment.fileName}
                    </p>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => !isProcessing && handleFileOpen(attachment)}
                    className={`w-32 h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 ${
                      isProcessing
                        ? "opacity-50 cursor-default"
                        : isMarkedForDelete
                          ? "opacity-50 border-2 border-red-400 hover:bg-gray-200 transition-colors"
                          : "hover:bg-gray-200 transition-colors"
                    }`}
                  >
                    <svg
                      className="w-12 h-12 text-gray-500 mb-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 18v-1h8v1H8zm0-4v-1h8v1H8z" />
                    </svg>
                    <p className="text-[10px] text-gray-600 text-center truncate w-full">
                      {attachment.fileName}
                    </p>
                  </button>
                )}
                {isMarkedForDelete && (
                  <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-br">
                    削除予定
                  </div>
                )}
              </div>
              {attachment.userId === userId &&
                (isImage ? imageUrl : true) &&
                !isProcessing && (
                  <>
                    {isMarkedForDelete
                      ? // 削除予定の場合は復元ボタン
                        onRestore && (
                          <button
                            onClick={() => onRestore(attachment.id)}
                            className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                            title="復元"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        )
                      : // 通常時は削除ボタン
                        onDelete && (
                          <button
                            onClick={() => onDelete(attachment.id)}
                            disabled={isDeleting}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                            title="削除"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                  </>
                )}
            </div>
          );
        })}

        {/* 保存待ちの画像・ファイル（プレビュー） */}
        {pendingUrls.map((url, index) => {
          const file = pendingImages[index];
          const isImage = file?.type.startsWith("image/");
          const isPdf = file?.type === "application/pdf";

          return (
            <div key={`pending-${index}`} className="relative group">
              {isImage ? (
                <div className="relative">
                  <img
                    src={url}
                    alt={`保存待ち ${index + 1}`}
                    className={`w-full md:w-32 h-auto md:h-32 md:object-cover rounded-lg transition-opacity ${
                      isUploading
                        ? "opacity-50"
                        : "cursor-pointer hover:opacity-80 border-2 border-blue-400"
                    }`}
                    onClick={() => !isUploading && setSelectedImage(url)}
                    referrerPolicy="no-referrer"
                  />
                  {/* アップロード中のローディング表示 */}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/30 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                  )}
                </div>
              ) : isPdf ? (
                <div className="relative">
                  <div
                    className={`w-32 h-32 bg-gray-100 rounded-lg border-2 border-blue-400 flex flex-col items-center justify-center p-2 ${
                      isUploading ? "opacity-50" : ""
                    }`}
                  >
                    <svg
                      className="w-12 h-12 text-red-500 mb-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 18v-1h8v1H8zm0-4v-1h8v1H8zm0-4v-1h5v1H8z" />
                    </svg>
                    <p className="text-[10px] text-gray-600 text-center truncate w-full">
                      {file?.name}
                    </p>
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/30 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={`w-32 h-32 bg-gray-100 rounded-lg border-2 border-blue-400 flex flex-col items-center justify-center p-2 ${
                      isUploading ? "opacity-50" : ""
                    }`}
                  >
                    <svg
                      className="w-12 h-12 text-gray-500 mb-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 18v-1h8v1H8zm0-4v-1h8v1H8z" />
                    </svg>
                    <p className="text-[10px] text-gray-600 text-center truncate w-full">
                      {file?.name}
                    </p>
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/30 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                  )}
                </div>
              )}
              {/* ステータスバッジ：アップロード中は「保存中...」に変更 */}
              <div className="absolute top-0 left-0 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded-br">
                {isUploading ? "保存中..." : "未保存"}
              </div>
              {onDeletePending && !isUploading && (
                <button
                  onClick={() => onDeletePending(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="削除"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 画像拡大表示モーダル */}
      <ImagePreviewModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}
