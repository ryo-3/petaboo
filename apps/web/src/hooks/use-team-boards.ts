import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { BoardWithStats } from "@/src/types/board";
import { useToast } from "@/src/contexts/toast-context";

interface ApiError extends Error {
  status?: number;
}

// セキュアなメモリキャッシュ（localStorage使用せず）
// let cachedToken: string | null = null;
// let tokenExpiry: number = 0;
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
      // cachedToken = token;
      // tokenExpiry = Date.now() + 1 * 60 * 1000; // 1分のみキャッシュ
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
        return [];
      }

      // 最大2回リトライ
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getCachedToken(getToken);
        const url = `${API_BASE_URL}/teams/${teamId}/boards?status=${status}`;

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        // 401エラーの場合はキャッシュをクリアしてリトライ
        if (response.status === 401 && attempt === 0) {
          // cachedToken = null;
          // tokenExpiry = 0;
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

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ JSON Parse Error:`, parseError);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }

        return data;
      }

      throw new Error("Failed after retry");
    },
    {
      enabled: isLoaded && teamId !== null && teamId > 0,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchInterval: 60 * 1000,
      refetchIntervalInBackground: true,
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
        console.error("チームボード作成エラー詳細:", {
          status: response.status,
          statusText: response.statusText,
          error,
        });
        throw new Error(
          error.error ||
            `Failed to create team board: ${response.status} ${response.statusText}`,
        );
      }

      return response.json();
    },
    onSuccess: (newBoard, { teamId }) => {
      queryClient.setQueryData<BoardWithStats[]>(
        ["team-boards", teamId, "normal"],
        (oldBoards) => {
          if (!oldBoards) return [newBoard];
          return [...oldBoards, newBoard];
        },
      );
    },
    onError: (error) => {
      console.error("チームボード作成に失敗しました:", error);
      showToast("チームボード作成に失敗しました", "error");
    },
  });
}

// チームボード更新
export function useUpdateTeamBoard(teamId: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: {
        name?: string;
        description?: string;
      };
    }) => {
      const token = await getCachedToken(getToken);

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/boards/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update team board");
      }

      return response.json();
    },
    onSuccess: (updatedBoard, { id, data }) => {
      ["normal", "completed", "deleted"].forEach((status) => {
        queryClient.setQueryData<BoardWithStats[]>(
          ["team-boards", teamId, status],
          (oldBoards) => {
            if (!oldBoards) return oldBoards;
            return oldBoards.map((board) =>
              board.id === id ? { ...board, ...data } : board,
            );
          },
        );
      });
      showToast("ボードが更新されました", "success");
    },
    onError: (error) => {
      console.error("チームボード更新に失敗しました:", error);
    },
  });
}

// チームボード削除
export function useDeleteTeamBoard(teamId: number) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (boardId: number) => {
      const token = await getCachedToken(getToken);

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/boards/${boardId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete team board");
      }

      return response.json();
    },
    onSuccess: () => {
      // キャッシュ無効化はリダイレクト先で行うため、ここでは何もしない
    },
    onError: (error) => {
      console.error("チームボード削除に失敗しました:", error);
    },
  });
}

// チームボード完了状態切り替え
export function useToggleTeamBoardCompletion(teamId: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (boardId: number) => {
      const token = await getCachedToken(getToken);

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/boards/${boardId}/toggle-completion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Failed to toggle team board completion",
        );
      }

      return response.json();
    },
    onSuccess: (result, boardId) => {
      const isCompleted = result.isCompleted;
      const fromStatus = isCompleted ? "normal" : "completed";
      const toStatus = isCompleted ? "completed" : "normal";

      // 移動元から削除
      let movedBoard: BoardWithStats | undefined;
      queryClient.setQueryData<BoardWithStats[]>(
        ["team-boards", teamId, fromStatus],
        (oldBoards) => {
          if (!oldBoards) return oldBoards;
          movedBoard = oldBoards.find((b) => b.id === boardId);
          return oldBoards.filter((b) => b.id !== boardId);
        },
      );

      // 移動先に追加
      if (movedBoard) {
        queryClient.setQueryData<BoardWithStats[]>(
          ["team-boards", teamId, toStatus],
          (oldBoards) => {
            if (!oldBoards) return [{ ...movedBoard!, isCompleted }];
            return [...oldBoards, { ...movedBoard!, isCompleted }];
          },
        );
      }

      showToast("ボードの完了状態が更新されました", "success");
    },
    onError: (error) => {
      console.error("チームボード完了状態の変更に失敗しました:", error);
    },
  });
}
