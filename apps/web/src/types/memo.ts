import { OriginalId, Uuid } from "./common";

export interface Memo {
  id: number;
  originalId?: OriginalId;
  uuid?: Uuid;
  title: string;
  content: string | null;
  categoryId?: number | null;
  createdAt: number;
  updatedAt?: number;
  tempId?: string;
  // チーム機能用（チームメモのみ）
  userId?: string; // 作成者のuser ID
  teamId?: number; // チームID
  createdBy?: string | null; // 作成者の表示名
  avatarColor?: string | null; // 作成者のアバター色
}

export interface DeletedMemo {
  id: number;
  originalId: OriginalId;
  uuid?: Uuid;
  title: string;
  content: string | null;
  categoryId?: number | null;
  createdAt: number;
  updatedAt?: number;
  deletedAt: number;
  // チーム機能用（チーム削除済みメモのみ）
  userId?: string; // 作成者のuser ID
  teamId?: number; // チームID
  createdBy?: string | null; // 作成者の表示名
  avatarColor?: string | null; // 作成者のアバター色
}

export interface CreateMemoData {
  title: string;
  content?: string;
  categoryId?: number | null;
}

export interface UpdateMemoData {
  title: string;
  content?: string;
  categoryId?: number | null;
}
