/**
 * キャッシュ管理ユーティリティ
 *
 * 設計思想:
 * - すべての変更は保存ボタンを通る
 * - invalidate/refetchを最小化し、setQueryDataで直接更新
 * - エンティティ別ではなく「操作 + itemType」で統一管理
 *
 * 参照: .claude/開発メモ/キャッシュ設計方針.md
 */

import { QueryClient } from "@tanstack/react-query";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Memo, DeletedMemo } from "@/src/types/memo";

// =============================================================================
// 型定義
// =============================================================================

export type ItemType = "task" | "memo";
export type Operation =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "permanentDelete";

/** タスクまたはメモの統一型 */
export type UnifiedItem = Task | Memo;

/** 削除済みタスクまたはメモの統一型 */
export type UnifiedDeletedItem = DeletedTask | DeletedMemo;

/**
 * キャッシュ操作で受け入れる最小限のインターフェース
 * Task, Memo, TeamTask, TeamMemo, DeletedTask, DeletedMemo など全ての型が満たす共通フィールド
 */
interface CacheableItem {
  id: number;
  displayId: string;
  createdAt: number;
  updatedAt?: number | null;
  deletedAt?: number;
}

/** ボードアイテムの型 */
interface BoardItem {
  id?: string | number;
  boardId?: number;
  itemId?: string;
  itemType: ItemType;
  content: UnifiedItem;
  createdAt?: number;
  updatedAt?: number;
  position?: number;
}

/** ボードデータの型 */
interface BoardData {
  items: BoardItem[];
  [key: string]: unknown;
}

// =============================================================================
// キャッシュキー生成
// =============================================================================

/**
 * アイテム一覧のキャッシュキーを生成
 * @param itemType - "task" or "memo"
 * @param teamId - チームID（個人モードの場合はundefined）
 */
export const getCacheKey = (
  itemType: ItemType,
  teamId?: number,
): (string | number | undefined)[] => {
  if (teamId) {
    return [`team-${itemType}s`, teamId];
  }
  return [itemType === "task" ? "tasks" : "memos"];
};

/**
 * 削除済みアイテム一覧のキャッシュキーを生成
 * @param itemType - "task" or "memo"
 * @param teamId - チームID（個人モードの場合はundefined）
 */
export const getDeletedCacheKey = (
  itemType: ItemType,
  teamId?: number,
): (string | number | undefined)[] => {
  if (teamId) {
    return [`team-deleted-${itemType}s`, teamId];
  }
  return itemType === "task" ? ["deleted-tasks"] : ["deletedMemos"];
};

/**
 * ボードアイテムのキャッシュキーを生成
 * @param boardId - ボードID
 * @param teamId - チームID（個人モードの場合はundefined）
 */
export const getBoardItemsCacheKey = (
  boardId: number,
  teamId?: number,
): (string | number | undefined)[] => {
  if (teamId) {
    return ["team-boards", teamId.toString(), boardId, "items"];
  }
  return ["boards", boardId, "items"];
};

// =============================================================================
// メインのキャッシュ更新関数
// =============================================================================

interface UpdateItemCacheParams {
  queryClient: QueryClient;
  itemType: ItemType;
  operation: Operation;
  item: CacheableItem;
  teamId?: number;
  boardId?: number;
}

/**
 * アイテムキャッシュを更新する共通関数
 *
 * invalidate/refetchを使用せず、setQueryDataで直接更新。
 * これにより、不要なAPIコールを排除し、UIの即時反映を実現。
 *
 * @example
 * // タスク作成時
 * updateItemCache({
 *   queryClient,
 *   itemType: "task",
 *   operation: "create",
 *   item: newTask,
 *   boardId: newTask.boardId,
 * });
 */
export const updateItemCache = ({
  queryClient,
  itemType,
  operation,
  item,
  teamId,
  boardId,
}: UpdateItemCacheParams): void => {
  const cacheKey = getCacheKey(itemType, teamId);
  const deletedCacheKey = getDeletedCacheKey(itemType, teamId);

  switch (operation) {
    case "create":
      // 一覧に追加（重複チェック付き）
      queryClient.setQueryData<UnifiedItem[]>(cacheKey, (old) => {
        if (!old) return [item as UnifiedItem];
        // displayIdで重複チェック
        const exists = old.some((i) => i.displayId === item.displayId);
        if (exists) return old;
        return [...old, item as UnifiedItem];
      });
      break;

    case "update":
      // 一覧の該当アイテムを置換
      queryClient.setQueryData<UnifiedItem[]>(cacheKey, (old) =>
        old?.map((i) => (i.id === item.id ? (item as UnifiedItem) : i)),
      );
      break;

    case "delete": {
      // 一覧から削除
      queryClient.setQueryData<UnifiedItem[]>(cacheKey, (old) =>
        old?.filter((i) => i.id !== item.id),
      );

      // 削除済みに追加（deletedAt付与、重複チェック付き）
      const deletedItem: UnifiedDeletedItem = {
        ...item,
        displayId: item.displayId || item.id.toString(),
        deletedAt: Date.now(),
      } as UnifiedDeletedItem;

      queryClient.setQueryData<UnifiedDeletedItem[]>(deletedCacheKey, (old) => {
        if (!old) return [deletedItem];
        // displayIdで重複チェック
        const exists = old.some((i) => i.displayId === deletedItem.displayId);
        if (exists) return old;
        return [deletedItem, ...old];
      });
      break;
    }

    case "restore": {
      // 削除済みから削除
      queryClient.setQueryData<UnifiedDeletedItem[]>(deletedCacheKey, (old) =>
        old?.filter((i) => i.displayId !== item.displayId),
      );

      // 一覧に追加（deletedAtを除去、重複チェック付き）
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deletedAt: _deletedAt, ...restoredItem } =
        item as UnifiedDeletedItem;
      queryClient.setQueryData<UnifiedItem[]>(cacheKey, (old) => {
        if (!old) return [restoredItem as UnifiedItem];
        // displayIdで重複チェック
        const exists = old.some((i) => i.displayId === restoredItem.displayId);
        if (exists) return old;
        return [restoredItem as UnifiedItem, ...old];
      });
      break;
    }

    case "permanentDelete":
      // 削除済みから削除のみ
      queryClient.setQueryData<UnifiedDeletedItem[]>(deletedCacheKey, (old) =>
        old?.filter((i) => i.displayId !== item.displayId),
      );
      break;
  }

  // ボード連携（boardIdが指定されている場合）
  if (boardId) {
    updateBoardItemCache({
      queryClient,
      boardId,
      itemType,
      operation,
      item,
      teamId,
    });
  }
};

// =============================================================================
// ボードキャッシュ更新関数
// =============================================================================

interface UpdateBoardItemCacheParams {
  queryClient: QueryClient;
  boardId: number;
  itemType: ItemType;
  operation: Operation;
  item: CacheableItem;
  teamId?: number;
}

/**
 * ボードアイテムキャッシュを更新する関数
 *
 * ボード詳細画面でのアイテム表示を即時更新。
 * メインのupdateItemCacheから自動的に呼び出される。
 */
export const updateBoardItemCache = ({
  queryClient,
  boardId,
  itemType,
  operation,
  item,
  teamId,
}: UpdateBoardItemCacheParams): void => {
  const boardCacheKey = getBoardItemsCacheKey(boardId, teamId);

  switch (operation) {
    case "create":
    case "restore":
      // ボードアイテム一覧に追加
      queryClient.setQueryData<BoardData>(boardCacheKey, (old) => {
        if (!old) return old;
        const newBoardItem: BoardItem = {
          id: `${itemType}_${item.id}`,
          boardId,
          itemId: item.displayId,
          itemType,
          content: item as UnifiedItem,
          createdAt: item.createdAt,
          updatedAt: (item as UnifiedItem).updatedAt ?? undefined,
          position: old.items?.length ?? 0,
        };
        return {
          ...old,
          items: [...(old.items || []), newBoardItem],
        };
      });
      break;

    case "update":
      // ボードアイテム一覧の該当アイテムを更新
      queryClient.setQueryData<BoardData>(boardCacheKey, (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((boardItem) =>
            boardItem.itemType === itemType && boardItem.content?.id === item.id
              ? { ...boardItem, content: item as UnifiedItem }
              : boardItem,
          ),
        };
      });
      break;

    case "delete":
      // ボードアイテム一覧から削除
      queryClient.setQueryData<BoardData>(boardCacheKey, (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter(
            (boardItem) =>
              !(
                boardItem.itemType === itemType &&
                boardItem.content?.id === item.id
              ),
          ),
        };
      });
      break;

    case "permanentDelete":
      // ボードキャッシュは変更なし（削除済みアイテムはボードに表示されない）
      break;
  }
};

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 複数アイテムのキャッシュを一括更新（一括操作用）
 *
 * 6件以上の一括操作の場合は、この関数ではなくinvalidateを使用することを推奨。
 * 設計方針に基づき、一括操作(6件以上)・CSVインポートではinvalidate許可。
 */
export const updateMultipleItemsCache = ({
  queryClient,
  itemType,
  operation,
  items,
  teamId,
}: {
  queryClient: QueryClient;
  itemType: ItemType;
  operation: Operation;
  items: (UnifiedItem | UnifiedDeletedItem)[];
  teamId?: number;
}): void => {
  // 6件以上の場合はinvalidateを使用（設計方針に従う）
  if (items.length >= 6) {
    const cacheKey = getCacheKey(itemType, teamId);
    const deletedCacheKey = getDeletedCacheKey(itemType, teamId);
    queryClient.invalidateQueries({ queryKey: cacheKey });
    if (operation === "delete" || operation === "restore") {
      queryClient.invalidateQueries({ queryKey: deletedCacheKey });
    }
    return;
  }

  // 5件以下は個別にsetQueryData
  items.forEach((item) => {
    updateItemCache({
      queryClient,
      itemType,
      operation,
      item,
      teamId,
    });
  });
};
