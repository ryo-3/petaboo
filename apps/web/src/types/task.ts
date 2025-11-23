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
  assigneeId?: string | null;
  assigneeName?: string | null; // 担当者の表示名
  assigneeAvatarColor?: string | null; // 担当者のアバター色
  commentCount?: number;
}

export interface DeletedTask
  extends BaseItemFields,
    TeamCreatorFields,
    DeletedItemFields {
  /** 削除済みタスクではoriginalIdは必須 */
  originalId: OriginalId;
  /** displayIdは必須（個人用・チーム用共通） */
  displayId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: number | null;
  categoryId: number | null;
  boardCategoryId: number | null; // ボードカテゴリーID
  assigneeId?: string | null;
  assigneeName?: string | null; // 担当者の表示名
  assigneeAvatarColor?: string | null; // 担当者のアバター色
  commentCount?: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null; // ボードカテゴリーID
  assigneeId?: string | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null; // ボードカテゴリーID
  assigneeId?: string | null;
}
