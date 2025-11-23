import { useItemBoards } from "@/src/hooks/use-boards";
import { ReactElement } from "react";

// アイテムタイプを定義
type ItemType = "memo" | "task";

// 基本的なアイテム型（idまたはdisplayIdを持つ）
interface BaseItem {
  id: number;
  displayId: string;
}

// 削除済みアイテム型（displayIdは必須）
interface DeletedItem {
  id: number;
  displayId: string;
}

interface ItemFilterWrapperProps<T extends BaseItem> {
  item: T;
  selectedBoardIds: number[];
  filterMode?: "include" | "exclude";
  children: ReactElement;
  itemType: ItemType;
  variant?: "normal" | "deleted";
}

/**
 * アイテムのボードフィルタリングを行う汎用ラッパーコンポーネント
 * メモとタスクの両方に対応
 */
function ItemFilterWrapper<T extends BaseItem>({
  item,
  selectedBoardIds,
  filterMode = "include",
  children,
  itemType,
  variant = "normal",
}: ItemFilterWrapperProps<T>) {
  // アイテムが所属するボード一覧を取得（フィルター無効時はundefinedを渡してクエリを無効化）
  // 削除済みアイテムの場合はoriginalIdを使用
  const isDeleted = variant === "deleted";
  const itemId = isDeleted ? (item as DeletedItem).displayId : item.displayId;

  const { data: boards, isLoading } = useItemBoards(
    itemType,
    selectedBoardIds && selectedBoardIds.length > 0 ? itemId : undefined,
  );

  // フィルターが設定されていない場合は常に表示
  if (!selectedBoardIds || selectedBoardIds.length === 0) {
    return children;
  }

  // ローディング中かつデータがない場合のみ非表示（プリフェッチキャッシュがある場合は表示）
  // タスクの場合はisLoadingをチェック、メモの場合は単純にboardsの存在のみチェック
  if (itemType === "task" && isLoading && !boards) {
    return null;
  } else if (itemType === "memo" && !boards) {
    return null;
  }

  // アイテムが所属するボードのID一覧を取得
  const itemBoardIds = boards ? boards.map((b) => b.id) : [];

  // フィルターモードに応じて表示判定
  let shouldShow: boolean;

  if (filterMode === "exclude") {
    // 除外モード：選択されたボードのいずれにも所属していない場合に表示
    shouldShow = !selectedBoardIds.some((selectedId) =>
      itemBoardIds.includes(selectedId),
    );
  } else {
    // 含むモード（デフォルト）：選択されたボードのいずれかに所属している場合に表示
    shouldShow = selectedBoardIds.some((selectedId) =>
      itemBoardIds.includes(selectedId),
    );
  }

  return shouldShow ? children : null;
}

export default ItemFilterWrapper;
