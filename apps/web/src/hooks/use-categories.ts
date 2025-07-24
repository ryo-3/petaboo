import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Category, CreateCategoryData, UpdateCategoryData, CategoryUsage } from "@/src/types/category";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

// カテゴリー更新
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Category, Error, { id: number; data: UpdateCategoryData }>({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

// カテゴリー削除
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
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
      const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/usage`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch category usage");
      }

      return response.json();
    },
    enabled: categoryId !== null,
  });
}