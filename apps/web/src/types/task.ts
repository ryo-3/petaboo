import {
  OriginalId,
  BaseItemFields,
  TeamCreatorFields,
  DeletedItemFields,
} from "./common";

export interface Task extends BaseItemFields, TeamCreatorFields {
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: number | null; // Unix timestamp
  categoryId: number | null;
  boardCategoryId: number | null; // ボードカテゴリーID
  commentCount?: number;
}

export interface DeletedTask
  extends BaseItemFields,
    TeamCreatorFields,
    DeletedItemFields {
  /** 削除済みタスクではoriginalIdは必須 */
  originalId: OriginalId;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: number | null;
  categoryId: number | null;
  boardCategoryId: number | null; // ボードカテゴリーID
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
