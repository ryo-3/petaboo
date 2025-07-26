"use client";

import { usePrefetchItemBoards } from "@/src/hooks/use-boards";
import { useMemo } from "react";

interface ItemBoardsPrefetcherProps {
  type: 'memo' | 'task';
  items?: Array<{ id: number }> | null;
}

/**
 * アイテムのボード情報をプリフェッチするコンポーネント
 * メモ一覧、タスク一覧、ボード詳細などで共通利用
 */
export default function ItemBoardsPrefetcher({ type, items }: ItemBoardsPrefetcherProps) {
  // プリフェッチ用のアイテムリスト作成
  const prefetchItems = useMemo(() => {
    return items?.map(item => ({ id: item.id })) || [];
  }, [items]);

  // プリフェッチ実行（副作用のみ、レンダリングなし）
  usePrefetchItemBoards(type, prefetchItems);

  // このコンポーネントは何もレンダリングしない
  return null;
}