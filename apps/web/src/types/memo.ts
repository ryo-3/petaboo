import { BaseItemFields, TeamCreatorFields, DeletedItemFields } from "./common";

export interface Memo extends BaseItemFields, TeamCreatorFields {
  title: string;
  content: string | null;
  categoryId?: number | null;
  tempId?: string;
  commentCount?: number;
}

export interface DeletedMemo
  extends BaseItemFields,
    TeamCreatorFields,
    DeletedItemFields {
  /** 削除済みメモではdisplayIdは必須 */
  /** displayIdは必須（個人用・チーム用共通） */
  displayId: string;
  title: string;
  content: string | null;
  categoryId?: number | null;
  commentCount?: number;
}

export interface CreateMemoData {
  title?: string;
  content?: string;
  categoryId?: number | null;
}

export interface UpdateMemoData {
  title?: string;
  content?: string;
  categoryId?: number | null;
  updatedAt?: number; // 楽観的ロック用
}
