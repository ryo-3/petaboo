import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * 認証付きで画像を取得し、blob URLに変換するフック
 * カードリスト表示で使用
 */
export function useAuthenticatedImage(imageUrl: string | undefined) {
  const { getToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setBlobUrl(null);
      return;
    }

    let isMounted = true;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        const token = await getToken();
        const response = await fetch(imageUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          console.error("画像の読み込みに失敗しました:", {
            status: response.status,
            url: imageUrl,
          });
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setBlobUrl(url);
        }
      } catch (error) {
        console.error("画像読み込みエラー:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadImage();

    // クリーンアップ
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return { blobUrl, isLoading };
}
