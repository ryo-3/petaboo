import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

/**
 * 認証付きで画像を取得し、blob URLに変換するフック
 * カードリスト表示で使用
 * useQueryでキャッシュし、ページ遷移時の再取得を防ぐ
 */
export function useAuthenticatedImage(imageUrl: string | undefined) {
  const { getToken } = useAuth();

  const { data: blobUrl, isLoading } = useQuery<string | null>(
    ["authenticated-image", imageUrl],
    async () => {
      if (!imageUrl) return null;

      const token = await getToken();
      const response = await fetch(imageUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        console.error("画像の読み込みに失敗しました:", {
          status: response.status,
          url: imageUrl,
        });
        throw new Error("画像の読み込みに失敗しました");
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    {
      enabled: !!imageUrl,
      staleTime: Infinity,
      cacheTime: 30 * 60 * 1000, // 30分保持
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  return { blobUrl: blobUrl ?? null, isLoading };
}
