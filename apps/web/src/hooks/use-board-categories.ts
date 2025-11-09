import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type {
  BoardCategory,
  NewBoardCategory,
  UpdateBoardCategory,
} from "@/src/types/board-categories";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export function useBoardCategories(boardId?: number, teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // ボードカテゴリー一覧取得（個人・チーム両対応）
  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["boardCategories", teamId, boardId],
    queryFn: async (): Promise<BoardCategory[]> => {
      const token = await getToken();
      let url = `${API_BASE_URL}/board-categories?`;
      if (teamId) url += `teamId=${teamId}&`;
      if (boardId) url += `boardId=${boardId}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("ボードカテゴリーの取得に失敗しました");
      }

      const data = await response.json();
      return data.map(
        (
          category: BoardCategory & { createdAt: number; updatedAt?: number },
        ) => ({
          ...category,
          createdAt: new Date(category.createdAt * 1000),
          updatedAt: category.updatedAt
            ? new Date(category.updatedAt * 1000)
            : undefined,
        }),
      );
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // ボードカテゴリー作成（個人・チーム両対応）
  const createCategory = useMutation({
    mutationFn: async (
      newCategory: NewBoardCategory & { teamId?: number },
    ): Promise<BoardCategory> => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/board-categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        let errorMessage = "ボードカテゴリーの作成に失敗しました";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error("Failed to parse error response:", jsonError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        ...data,
        createdAt: new Date(data.createdAt * 1000),
        updatedAt: data.updatedAt ? new Date(data.updatedAt * 1000) : undefined,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardCategories", teamId] });
    },
  });

  // ボードカテゴリー更新
  const updateCategory = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateBoardCategory;
    }): Promise<BoardCategory> => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/board-categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = "ボードカテゴリーの更新に失敗しました";
        try {
          const responseText = await response.text();
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              if (
                errorData.error &&
                errorData.error.name === "ZodError" &&
                errorData.error.issues
              ) {
                // Zodバリデーションエラーの場合、具体的なメッセージを構築
                const issues = errorData.error.issues
                  .map(
                    (issue: { path: string[]; message: string }) =>
                      `${issue.path.join(".")}: ${issue.message}`,
                  )
                  .join(", ");
                errorMessage = `バリデーションエラー: ${issues}`;
              } else {
                errorMessage = errorData.error || errorMessage;
              }
            } catch {
              errorMessage = `HTTP ${response.status}: ${responseText || response.statusText}`;
            }
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      return {
        ...responseData,
        createdAt: new Date(responseData.createdAt * 1000),
        updatedAt: responseData.updatedAt
          ? new Date(responseData.updatedAt * 1000)
          : undefined,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardCategories"] });
    },
  });

  // ボードカテゴリー削除
  const deleteCategory = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/board-categories/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        let errorMessage = "ボードカテゴリーの削除に失敗しました";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error("Failed to parse error response:", jsonError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardCategories"] });
    },
  });

  // カテゴリー並び替え
  const reorderCategories = useMutation({
    mutationFn: async (categoryIds: number[]): Promise<void> => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/board-categories/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ categoryIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "カテゴリーの並び替えに失敗しました",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardCategories"] });
    },
  });

  return {
    categories: categories || [],
    isLoading,
    error,
    createCategory: createCategory.mutateAsync,
    updateCategory: updateCategory.mutateAsync,
    deleteCategory: deleteCategory.mutateAsync,
    reorderCategories: reorderCategories.mutateAsync,
    isCreating: createCategory.isPending,
    isUpdating: updateCategory.isPending,
    isDeleting: deleteCategory.isPending,
    isReordering: reorderCategories.isPending,
  };
}
