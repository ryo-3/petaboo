interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * 画像拡大表示モーダル（共通コンポーネント）
 * - 背景: 濃い黒（90%不透明）
 * - 閉じるボタン: 右上固定
 * - 画像: 95vw x 95vh の最大サイズ
 */
export default function ImagePreviewModal({
  imageUrl,
  onClose,
}: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
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

      {/* 画像（最大サイズで表示） */}
      <img
        src={imageUrl}
        alt="拡大表示"
        className="max-w-[95vw] max-h-[95vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
