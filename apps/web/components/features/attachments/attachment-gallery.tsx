import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/src/contexts/toast-context";
import type { Attachment } from "@/src/hooks/use-attachments";

interface AttachmentGalleryProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: number) => void;
  isDeleting?: boolean;
}

export default function AttachmentGallery({
  attachments,
  onDelete,
  isDeleting = false,
}: AttachmentGalleryProps) {
  const { userId, getToken } = useAuth();
  const { showToast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

  // 認証付きで画像を取得してBlob URLを生成
  useEffect(() => {
    let isMounted = true;
    const urls: Record<number, string> = {};

    const loadImages = async () => {
      const token = await getToken();

      for (const attachment of attachments) {
        try {
          const response = await fetch(attachment.url, {
            method: "GET",
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });

          if (response.ok && isMounted) {
            const blob = await response.blob();
            urls[attachment.id] = URL.createObjectURL(blob);
          }
        } catch (error) {
          console.error(`画像読み込みエラー [ID: ${attachment.id}]:`, error);
        }
      }

      if (isMounted) {
        setImageUrls(urls);
      }
    };

    if (attachments.length > 0) {
      loadImages();
    }

    // クリーンアップ: Blob URLを解放
    return () => {
      isMounted = false;
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments, getToken]);

  if (attachments.length === 0) {
    return null;
  }

  const handleDelete = (attachment: Attachment) => {
    if (attachment.userId !== userId) {
      showToast("自分がアップロードした画像のみ削除できます", "error");
      return;
    }

    if (
      window.confirm(
        `「${attachment.fileName}」を削除しますか？\nこの操作は取り消せません。`,
      )
    ) {
      onDelete?.(attachment.id);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {attachments.map((attachment) => {
          const imageUrl = imageUrls[attachment.id];
          return (
            <div key={attachment.id} className="relative group">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={attachment.fileName}
                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(imageUrl)}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-500">読込中...</span>
                </div>
              )}
              {attachment.userId === userId && onDelete && imageUrl && (
                <button
                  onClick={() => handleDelete(attachment)}
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
            </div>
          );
        })}
      </div>

      {/* 画像拡大表示モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="拡大表示"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100"
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
          </div>
        </div>
      )}
    </>
  );
}
