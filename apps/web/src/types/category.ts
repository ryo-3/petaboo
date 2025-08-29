export interface Category {
  id: number;
  name: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCategoryData {
  name: string;
}

export interface UpdateCategoryData {
  name: string;
}

export interface CategoryUsage {
  categoryId: number;
  memoCount: number;
  taskCount: number;
  boardCount: number;
}
