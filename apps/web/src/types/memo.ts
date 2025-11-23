import {
  OriginalId,
  BaseItemFields,
  TeamCreatorFields,
  DeletedItemFields,
} from "./common";

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
  /** 削除済みメモではoriginalIdは必須 */
  originalId: OriginalId;
  /** チームメモの場合はdisplayIdも必須 */
  displayId?: string;
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
}
