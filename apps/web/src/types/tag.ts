/**
 * タグ関連の型定義
 */

export interface Tag {
  id: number;
  name: string;
  color?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tagging {
  id: number;
  tagId: number;
  targetType: "memo" | "task" | "board";
  targetOriginalId: string; // 個人側で使用中（個人側Phase完了後に削除予定）
  targetDisplayId: string;
  userId: string;
  createdAt: Date;
  tag?: Tag;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

export interface CreateTaggingData {
  tagId: number;
  targetType: "memo" | "task" | "board";
  targetDisplayId: string;
}

export interface TagWithUsage extends Tag {
  usageCount?: number;
}

export interface TagStats {
  totalUsage: number;
  memoCount: number;
  taskCount: number;
  boardCount: number;
}
