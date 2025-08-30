import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { BoardWithStats } from "@/src/types/board";
import { useToast } from "@/src/contexts/toast-context";

interface ApiError extends Error {
  status?: number;
}

// セキュアなメモリキャッシュ（localStorage使用せず）
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string | null> | null = null; // 同期化用

async function getCachedToken(
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  // 既に取得中の場合は同じPromiseを返す（同期化）
  if (tokenPromise) {
    return tokenPromise;
  }

  // 新しいトークン取得を開始
  tokenPromise = (async () => {
    const token = await getToken();

    if (token) {
      cachedToken = token;
      tokenExpiry = Date.now() + 1 * 60 * 1000; // 1分のみキャッシュ
    }

    // 取得完了後、Promiseをクリア
    tokenPromise = null;
    return token;
  })();

  return tokenPromise;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

// チーム用ボード一覧取得
export function useTeamBoards(
  teamId: number | null,
  status: "normal" | "completed" | "deleted" = "normal",
) {
  const { getToken, isLoaded } = useAuth();

  return useQuery<BoardWithStats[]>(
    ["team-boards", teamId, status],
    async () => {
      if (!teamId) {
        console.log(
          `useTeamBoards: teamId is null or undefined, returning empty array`,
        );
        return [];
      }

      console.log(
        `🔍 Team Boards Request - teamId: ${teamId}, status: ${status}, API_BASE_URL: ${API_BASE_URL}`,
      );

      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        const url = `${API_BASE_URL}/teams/${teamId}/boards?status=${status}`;

        console.log(`📡 Fetching team boards - Attempt ${attempt + 1}:`);
        console.log(`   URL: ${url}`);
        console.log(
          `   Token: ${token ? `${token.substring(0, 20)}...` : "null"}`,
        );

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        console.log(
          `📨 Response status: ${response.status} ${response.statusText}`,
        );
        console.log(
          `📨 Response headers:`,
          Object.fromEntries(response.headers.entries()),
        );

        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          cachedToken = null;
          tokenExpiry = 0;
          continue;
        }

        if (!response.ok) {
          const error: ApiError = new Error(
            `Failed to fetch team boards: ${response.status} ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        const responseText = await response.text();
        console.log(`📦 Raw response body:`, responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ JSON Parse Error:`, parseError);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }

        console.log(
          `✅ Parsed team boards data (status: ${status}, teamId: ${teamId}):`,
          {
            dataType: Array.isArray(data) ? "array" : typeof data,
            length: Array.isArray(data) ? data.length : "N/A",
            data: data,
            firstItem:
              Array.isArray(data) && data.length > 0 ? data[0] : "none",
          },
        );

        return data;
      }

      throw new Error("Failed after retry");
    },
    {
      enabled: isLoaded && teamId !== null && teamId > 0,
    },
  );
}

// チーム用ボード作成
export function useCreateTeamBoard() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<
    BoardWithStats,
    Error,
    { teamId: number; name: string; slug: string; description?: string }
  >({
    mutationFn: async ({ teamId, name, slug, description }) => {
      const token = await getCachedToken(getToken);
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          name,
          slug,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create team board");
      }

      return response.json();
    },
    onSuccess: (newBoard, { teamId }) => {
      // 新しいボードは通常状態で作成されるため、normal状態のボード一覧に追加
      queryClient.setQueryData<BoardWithStats[]>(
        ["team-boards", teamId, "normal"],
        (oldBoards) => {
          if (!oldBoards) return [newBoard];
          return [...oldBoards, newBoard];
        },
      );
      // 他のステータスのキャッシュも無効化（統計情報の整合性のため）
      queryClient.invalidateQueries({
        queryKey: ["team-boards", teamId, "completed"],
      });
      queryClient.invalidateQueries({
        queryKey: ["team-boards", teamId, "deleted"],
      });
    },
    onError: (error) => {
      console.error("チームボード作成に失敗しました:", error);
      showToast("チームボード作成に失敗しました", "error");
    },
  });
}
