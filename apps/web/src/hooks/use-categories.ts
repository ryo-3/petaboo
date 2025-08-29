import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryUsage,
} from "@/src/types/category";
import { useToast } from "@/src/contexts/toast-context";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8794";

// カテゴリー一覧取得
export function useCategories() {
  const { getToken } = useAuth();

  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      return response.json();
    },
  });
}

// カテゴリー作成
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<Category, Error, CreateCategoryData>({
    mutationFn: async (data) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create category");
      }

      return response.json();
    },
    onSuccess: (newCategory) => {
      // カテゴリー一覧に新しいカテゴリーを追加
      queryClient.setQueryData<Category[]>(["categories"], (oldCategories) => {
        if (!oldCategories) return [newCategory];
        return [...oldCategories, newCategory];
      });
    },
    onError: (error) => {
      console.error("カテゴリー作成に失敗しました:", error);
      showToast("カテゴリー作成に失敗しました", "error");
    },
  });
}

// カテゴリー更新
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<Category, Error, { id: number; data: UpdateCategoryData }>(
    {
      mutationFn: async ({ id, data }) => {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update category");
        }

        return response.json();
      },
      onSuccess: (updatedCategory, { id }) => {
        // カテゴリー一覧の特定カテゴリーを更新
        queryClient.setQueryData<Category[]>(
          ["categories"],
          (oldCategories) => {
            if (!oldCategories) return [updatedCategory];
            return oldCategories.map((category) =>
              category.id === id ? updatedCategory : category,
            );
          },
        );
        // カテゴリー使用状況キャッシュを無効化（名前が変わった場合）
        queryClient.invalidateQueries({ queryKey: ["category-usage", id] });
      },
      onError: (error) => {
        console.error("カテゴリー更新に失敗しました:", error);
        showToast("カテゴリー更新に失敗しました", "error");
      },
    },
  );
}

// カテゴリー削除
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete category");
      }
    },
    onSuccess: (_, id) => {
      // カテゴリー一覧から削除されたカテゴリーを除去
      queryClient.setQueryData<Category[]>(["categories"], (oldCategories) => {
        if (!oldCategories) return [];
        return oldCategories.filter((category) => category.id !== id);
      });
      // 削除されたカテゴリーの使用状況キャッシュを無効化
      queryClient.removeQueries({ queryKey: ["category-usage", id] });
      // メモ・タスクのキャッシュを無効化（削除されたカテゴリーが使われていた可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["memos"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("カテゴリー削除に失敗しました:", error);
      showToast("カテゴリー削除に失敗しました", "error");
    },
  });
}

// カテゴリー使用状況取得
export function useCategoryUsage(categoryId: number | null) {
  const { getToken } = useAuth();

  return useQuery<CategoryUsage>({
    queryKey: ["category-usage", categoryId],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/categories/${categoryId}/usage`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch category usage");
      }

      return response.json();
    },
    enabled: categoryId !== null,
  });
}
