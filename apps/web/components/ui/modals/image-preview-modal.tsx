import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

type CopyStatus = "idle" | "copying" | "success" | "error";

/**
 * 画像拡大表示モーダル（共通コンポーネント）
 * - 背景: 濃い黒（90%不透明）
 * - 閉じるボタン: 右上固定
 * - 画像: 95vw x 95vh の最大サイズ
 * - React Portalでbody直下にレンダリング
 */
export default function ImagePreviewModal({
  imageUrl,
  onClose,
}: ImagePreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleCopyImage = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!imageUrl || copyStatus === "copying") return;

      setCopyStatus("copying");
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

        setCopyStatus("success");
        setTimeout(() => setCopyStatus("idle"), 2000);
      } catch (err) {
        console.error("画像コピー失敗:", err);
        setCopyStatus("error");
        setTimeout(() => setCopyStatus("idle"), 2000);
      }
    },
    [imageUrl, copyStatus],
  );

  if (!imageUrl || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 閉じるボタン（右上固定） */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 bg-white text-gray-800 rounded-full p-3 hover:bg-gray-100 shadow-lg z-10"
      >
        <svg
          className="w-6 h-6"
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

      {/* 画像コンテナ */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {/* 画像（最大サイズで表示） */}
        <img
          src={imageUrl}
          alt="拡大表示"
          draggable={false}
          className="max-w-[95vw] max-h-[95vh] object-contain"
        />

        {/* 画像コピーボタン（左下固定） */}
        <button
          onClick={handleCopyImage}
          disabled={copyStatus === "copying"}
          className={`absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all ${
            copyStatus === "success"
              ? "bg-green-500 text-white"
              : copyStatus === "error"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-800 hover:bg-gray-100"
          }`}
        >
          {copyStatus === "copying" ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
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
          ) : copyStatus === "success" ? (
            <svg
              className="w-5 h-5"
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
          ) : copyStatus === "error" ? (
            <svg
              className="w-5 h-5"
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
          ) : (
            <svg
              className="w-5 h-5"
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
          <span className="text-sm font-medium">
            {copyStatus === "copying"
              ? "コピー中..."
              : copyStatus === "success"
                ? "コピー完了"
                : copyStatus === "error"
                  ? "失敗"
                  : "画像をコピー"}
          </span>
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
