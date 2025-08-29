import { Memo } from "./memo";
import { Task } from "./task";
import { OriginalId } from "./common";
import type { BoardCategory } from "./board-categories";

export interface Board {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  boardCategoryId?: number;
  userId: string;
  position: number;
  archived: boolean;
  completed: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface BoardWithCategory extends Board {
  boardCategory?: BoardCategory;
}

export interface DeletedBoard {
  id: number;
  userId: string;
  originalId: OriginalId;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

export interface BoardWithStats extends Board {
  memoCount: number;
  taskCount: number;
}

export interface BoardItem {
  id: number;
  boardId: number;
  itemType: "memo" | "task";
  itemId: OriginalId;
  position: number;
  createdAt: number;
}

export interface BoardWithItems extends Board {
  items: BoardItemWithContent[];
}

export interface BoardItemWithContent extends BoardItem {
  content: Memo | Task; // メモまたはタスクの実際の内容
}

export interface CreateBoardData {
  name: string;
  description?: string;
}

export interface UpdateBoardData {
  name?: string;
  description?: string;
}

export interface AddItemToBoardData {
  itemType: "memo" | "task";
  itemId: OriginalId;
}
