import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Tooltip from "../base/tooltip";

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

  const handleDownloadImage = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!imageUrl) return;

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // ファイル名をURLから取得、なければデフォルト
        const filename =
          imageUrl.split("/").pop()?.split("?")[0] || "image.png";

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("画像ダウンロード失敗:", err);
      }
    },
    [imageUrl],
  );

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
      {/* 閉じるボタン（右上固定・小さめ） */}
      <button
        onClick={onClose}
        className="fixed top-2 right-2 bg-white/80 text-gray-800 rounded-full p-1.5 hover:bg-white shadow-lg z-10"
      >
        <svg
          className="w-4 h-4"
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
        <img
          src={imageUrl}
          alt="拡大表示"
          draggable={false}
          className="max-w-[95vw] max-h-[95vh] object-contain"
        />
      </div>

      {/* アクションボタン（画面左下固定） */}
      <div className="fixed bottom-4 left-4 z-10 flex gap-2">
        {/* コピーボタン */}
        <Tooltip
          text={
            copyStatus === "success"
              ? "コピー完了"
              : copyStatus === "error"
                ? "コピー失敗"
                : "画像をコピー"
          }
          position="top"
        >
          <button
            onClick={handleCopyImage}
            disabled={copyStatus === "copying"}
            className={`p-2 rounded-full shadow-lg transition-all ${
              copyStatus === "success"
                ? "bg-green-500 text-white"
                : copyStatus === "error"
                  ? "bg-red-500 text-white"
                  : "bg-white/80 text-gray-800 hover:bg-white"
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
          </button>
        </Tooltip>

        {/* ダウンロードボタン */}
        <Tooltip text="ダウンロード" position="top">
          <button
            onClick={handleDownloadImage}
            className="p-2 rounded-full shadow-lg transition-all bg-white/80 text-gray-800 hover:bg-white"
          >
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
