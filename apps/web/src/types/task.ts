import { BaseItemFields, TeamCreatorFields, DeletedItemFields } from "./common";
import type { TaskStatus } from "@/src/config/taskTabConfig";

export interface Task extends BaseItemFields, TeamCreatorFields {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dueDate: number | null; // Unix timestamp
  categoryId: number | null;
  boardCategoryId: number | null; // ボードカテゴリーID
  assigneeId?: string | null;
  assigneeName?: string | null; // 担当者の表示名
  assigneeAvatarColor?: string | null; // 担当者のアバター色
  commentCount?: number;
  completedAt?: number | null; // 完了日時（ステータス履歴から取得）
  completedBy?: string | null; // 完了させたユーザーID
  completedByName?: string | null; // 完了させたユーザー名
  completedByAvatarColor?: string | null; // 完了させたユーザーのアバター色
}

export interface DeletedTask
  extends BaseItemFields,
    TeamCreatorFields,
    DeletedItemFields {
  /** 削除済みタスクではdisplayIdは必須 */
  /** displayIdは必須（個人用・チーム用共通） */
  displayId: string;
  title: string;
  description: string | null;
  status: TaskStatus | string;
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
  status?: TaskStatus;
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null; // ボードカテゴリーID
  assigneeId?: string | null;
  notificationUrl?: string; // 通知用: 現在のURL（クエリ部分）
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number | null;
  boardCategoryId?: number | null; // ボードカテゴリーID
  assigneeId?: string | null;
  updatedAt?: number; // 楽観的ロック用
  notificationUrl?: string; // 通知用: 現在のURL（クエリ部分）
}

export type { TaskStatus } from "@/src/config/taskTabConfig";

// ステータス変更履歴
export interface TaskStatusHistoryItem {
  id: number;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  changedAt: number; // Unix timestamp
  userId?: string; // チームのみ（変更者のユーザーID）
  userName?: string | null; // チームのみ（変更者名）
  userAvatarColor?: string | null; // チームのみ（変更者のアバター色）
}
