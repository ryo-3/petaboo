import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/src/contexts/toast-context";
import type { Attachment } from "@/src/hooks/use-attachments";
import ImagePreviewModal from "@/components/ui/modals/image-preview-modal";
import Tooltip from "@/components/ui/base/tooltip";

type CopyStatus = Record<string, "idle" | "copying" | "success" | "error">;

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
  const [copyStatus, setCopyStatus] = useState<CopyStatus>({});

  // 画像コピー処理
  const handleCopyImage = useCallback(
    async (imageUrl: string, key: string) => {
      if (copyStatus[key] === "copying") return;

      setCopyStatus((prev) => ({ ...prev, [key]: "copying" }));
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // PNGに変換（Clipboard APIはPNGのみ対応）
        let pngBlob: Blob;
        if (blob.type === "image/png") {
          pngBlob = blob;
        } else {
          const canvas = document.createElement("canvas");
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = URL.createObjectURL(blob);
          await img.decode();

          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext("2d")?.drawImage(img, 0, 0);

          pngBlob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("変換失敗"))),
              "image/png",
            ),
          );
          URL.revokeObjectURL(img.src);
        }

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);

        setCopyStatus((prev) => ({ ...prev, [key]: "success" }));
        showToast("画像をコピーしました", "success");
        setTimeout(
          () => setCopyStatus((prev) => ({ ...prev, [key]: "idle" })),
          2000,
        );
      } catch (err) {
        console.error("画像コピー失敗:", err);
        setCopyStatus((prev) => ({ ...prev, [key]: "error" }));
        showToast("画像のコピーに失敗しました", "error");
        setTimeout(
          () => setCopyStatus((prev) => ({ ...prev, [key]: "idle" })),
          2000,
        );
      }
    },
    [copyStatus, showToast],
  );

  // 画像ダウンロード処理
  const handleDownloadImage = useCallback(
    async (imageUrl: string, filename?: string) => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const downloadFilename =
          filename || imageUrl.split("/").pop()?.split("?")[0] || "image.png";

        const a = document.createElement("a");
        a.href = url;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("画像ダウンロード失敗:", err);
        showToast("画像のダウンロードに失敗しました", "error");
      }
    },
    [showToast],
  );

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
    const filteredPendingImages = pendingImages.filter((file) => {
      const fileKey = `${file.name}-${file.size}`;
      return !existingFiles.has(fileKey);
    });

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
      <div className="flex flex-col md:flex-row md:flex-wrap gap-2 mt-3 px-2 pb-32 md:pb-8">
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
                      draggable={false}
                      className={`w-full md:min-w-32 md:max-w-80 md:min-h-32 md:max-h-64 object-contain rounded-lg ${
                        isProcessing
                          ? "opacity-50 cursor-default border border-gray-300"
                          : isMarkedForDelete
                            ? "opacity-50 border-2 border-red-400 cursor-pointer hover:opacity-80 transition-opacity"
                            : "cursor-pointer hover:opacity-80 transition-opacity border border-gray-300"
                      }`}
                      onClick={() =>
                        !isProcessing && setSelectedImage(imageUrl)
                      }
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-500">読込中...</span>
                    </div>
                  )
                ) : isPdf ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => !isProcessing && handleFileOpen(attachment)}
                    className={`w-48 h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 ${
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
                    className={`w-48 h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-2 ${
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
                          <Tooltip
                            text="復元"
                            position="bottom"
                            className="!absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <button
                              onClick={() => onRestore(attachment.id)}
                              className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600"
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
                          </Tooltip>
                        )
                      : // 通常時は削除ボタン
                        onDelete && (
                          <Tooltip
                            text="削除"
                            position="bottom"
                            className="!absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <button
                              onClick={() => onDelete(attachment.id)}
                              disabled={isDeleting}
                              className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
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
                          </Tooltip>
                        )}
                  </>
                )}
              {/* 画像アクションボタン（左下） */}
              {isImage && imageUrl && !isProcessing && !isMarkedForDelete && (
                <div className="!absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* コピーボタン */}
                  <Tooltip text="画像をコピー" position="top">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyImage(
                          imageUrl,
                          `attachment-${attachment.id}`,
                        );
                      }}
                      disabled={
                        copyStatus[`attachment-${attachment.id}`] === "copying"
                      }
                      className={`rounded-full p-1 ${
                        copyStatus[`attachment-${attachment.id}`] === "success"
                          ? "bg-green-500 text-white"
                          : copyStatus[`attachment-${attachment.id}`] ===
                              "error"
                            ? "bg-red-500 text-white"
                            : "bg-white/90 text-gray-700 hover:bg-white"
                      }`}
                    >
                      {copyStatus[`attachment-${attachment.id}`] ===
                      "copying" ? (
                        <svg
                          className="w-3 h-3 animate-spin"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : copyStatus[`attachment-${attachment.id}`] ===
                        "success" ? (
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                  </Tooltip>
                  {/* ダウンロードボタン */}
                  <Tooltip text="ダウンロード" position="top">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage(imageUrl, attachment.fileName);
                      }}
                      className="rounded-full p-1 bg-white/90 text-gray-700 hover:bg-white"
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                </div>
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
                    draggable={false}
                    className={`w-full md:min-w-24 md:max-w-64 md:min-h-24 md:max-h-48 object-contain rounded-lg transition-opacity ${
                      isUploading
                        ? "opacity-50 border border-gray-300"
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
                    className={`w-48 h-48 bg-gray-100 rounded-lg border-2 border-blue-400 flex flex-col items-center justify-center p-2 ${
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
                    className={`w-48 h-48 bg-gray-100 rounded-lg border-2 border-blue-400 flex flex-col items-center justify-center p-2 ${
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
                <Tooltip
                  text="削除"
                  position="bottom"
                  className="!absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    onClick={() => onDeletePending(index)}
                    className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                </Tooltip>
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
