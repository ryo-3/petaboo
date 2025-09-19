import { OriginalId, Uuid } from "./common";

export interface Task {
  id: number;
  originalId?: OriginalId;
  uuid?: Uuid;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: number | null; // Unix timestamp
  categoryId: number | null;
  boardCategoryId: number | null; // ボードカテゴリーID
  createdAt: number;
  updatedAt: number | null;
  // チーム機能用（チームタスクのみ）
  userId?: string; // 作成者のuser ID
  teamId?: number; // チームID
  createdBy?: string | null; // 作成者の表示名
}

export interface DeletedTask {
  id: number;
  originalId: OriginalId;
  uuid?: Uuid;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: number | null;
  categoryId: number | null;
  boardCategoryId: number | null; // ボードカテゴリーID
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number;
  // チーム機能用（チーム削除済みタスクのみ）
  userId?: string; // 作成者のuser ID
  teamId?: number; // チームID
  createdBy?: string | null; // 作成者の表示名
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null; // ボードカテゴリーID
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null; // ボードカテゴリーID
}
